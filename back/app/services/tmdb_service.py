from typing import Optional, List
import httpx
from app.core.config import TMDB_BASE_URL, TMDB_API_KEY
from app.schemas.movie import MovieSearchResponse


def search_movies_tmdb(query: str, page: int = 1) -> List[dict]:
    url = f"{TMDB_BASE_URL}/search/movie"
    params = {"api_key": TMDB_API_KEY, "query": query, "page": page, "include_adult": False}
    response = httpx.get(url, params=params, timeout=10.0)
    return response.json().get("results", []) if response.status_code == 200 else []

def search_tmdb_only(query: str) -> List[MovieSearchResponse]:
    results = search_movies_tmdb(query)

    filtered = [
        m for m in results
        if m.get("poster_path") and m.get("vote_average") and m.get("overview") is not None
    ][:5]

    return [
        MovieSearchResponse(
            tmdb_id=m["id"],
            title=m["title"],
            rating=m["vote_average"],
            year=int(m["release_date"].split("-")[0]) if m.get("release_date") else None,
            poster_url=m['poster_path']
        )
        for m in filtered
    ]

def fetch_movie_data_by_tmdb(tmdb_id: int) -> Optional[dict]:
    movie_url = f"{TMDB_BASE_URL}/movie/{tmdb_id}"
    credits_url = f"{TMDB_BASE_URL}/movie/{tmdb_id}/credits"
    videos_url = f"{TMDB_BASE_URL}/movie/{tmdb_id}/videos"
    params = {"api_key": TMDB_API_KEY}

    movie_resp = httpx.get(movie_url, params=params, timeout=10.0)
    credits_resp = httpx.get(credits_url, params=params, timeout=10.0)
    videos_resp = httpx.get(videos_url, params=params, timeout=10.0)

    if movie_resp.status_code != 200:
        return None

    movie = movie_resp.json()
    credits = credits_resp.json() if credits_resp.status_code == 200 else {}
    videos = videos_resp.json().get("results", []) if videos_resp.status_code == 200 else []

    trailer_url = None
    for v in videos:
        if v["site"] == "YouTube" and v["type"] == "Trailer":
            trailer_url = v['key']
            break

    # Actores principales
    actors = []
    for cast in credits.get("cast", [])[:10]:
        actors.append({
            "tmdb_id": cast.get("id"),
            "name": cast.get("name"),
            "profile_path": cast.get("profile_path"),
            "character": cast.get("character")
        })

    # Director (solo uno principal)
    director_data = next((c for c in credits.get("crew", []) if c.get("job") == "Director"), None)
    collection = movie.get("belongs_to_collection")

    return {
        "tmdb_id": movie.get("id"),
        "title": movie.get("title"),
        "year": int(movie.get("release_date", "0000")[:4]) if movie.get("release_date") else None,
        "genres": [g["name"] for g in movie.get("genres", [])],
        "poster_url": movie['poster_path'] if movie.get("poster_path") else None,
        "released": movie.get("release_date"),
        "runtime": f"{movie.get('runtime')} min" if movie.get("runtime") else None,
        "director": {
            "tmdb_id": director_data.get("id") if director_data else None,
            "name": director_data.get("name") if director_data else None,
            "profile_path": director_data.get("profile_path") if director_data else None,
        } if director_data else None,
        "box_office": movie.get("revenue") if movie.get("revenue") else None,
        "website": movie.get("homepage") if movie.get("homepage") else None,
        "type": "movie",
        "plot": movie.get("overview"),
        "rating": movie.get("vote_average"),
        "tagline": movie.get("tagline"),
        "backdrop_url": movie['backdrop_path'] if movie.get("backdrop_path") else None,
        "origin_country": ",".join(movie.get("origin_country", [])),
        "trailer_url": trailer_url,
        "actors": actors,
        "collection": {
            "tmdb_id": collection["id"],
            "name": collection["name"],
            "poster_url": collection['poster_path'] if collection.get("poster_path") else None,
            "backdrop_url": collection['backdrop_path'] if collection.get("backdrop_path") else None,
        } if collection else None
    }

def fetch_person_data_by_tmdb(tmdb_id: int) -> Optional[dict]:
    url = f"{TMDB_BASE_URL}/person/{tmdb_id}"
    params = {"api_key": TMDB_API_KEY}
    response = httpx.get(url, params=params, timeout=10.0)

    if response.status_code != 200:
        return None

    p = response.json()

    return {
        "tmdb_id": p.get("id"),
        "name": p.get("name"),
        "photo_url": p.get("profile_path"),
        "biography": p.get("biography"),
        "birthday": p.get("birthday"),
        "place_of_birth": p.get("place_of_birth"),
    }