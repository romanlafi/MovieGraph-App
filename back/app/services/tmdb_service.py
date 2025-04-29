import os
import httpx
from typing import Optional, List

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
TMDB_BASE_URL = os.getenv("TMDB_BASE_URL", "https://api.themoviedb.org/3")
TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w500"

def search_movies_tmdb(query: str, page: int = 1) -> List[dict]:
    url = f"{TMDB_BASE_URL}/search/movie"
    params = {"api_key": TMDB_API_KEY, "query": query, "page": page, "include_adult": False}
    response = httpx.get(url, params=params, timeout=10.0)
    return response.json().get("results", []) if response.status_code == 200 else []

def fetch_movie_data_by_tmdb(tmdb_id: int) -> Optional[dict]:
    import httpx
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
            trailer_url = f"https://www.youtube.com/watch?v={v['key']}"
            break

    # Actores principales
    actors = []
    for cast in credits.get("cast", [])[:10]:
        actors.append({
            "tmdb_id": cast.get("id"),
            "name": cast.get("name"),
            "profile_path": cast.get("profile_path")
        })

    # Director (solo uno principal)
    director_data = next((c for c in credits.get("crew", []) if c.get("job") == "Director"), None)

    return {
        "tmdb_id": movie.get("id"),
        "title": movie.get("title"),
        "year": int(movie.get("release_date", "0000")[:4]) if movie.get("release_date") else None,
        "genres": [g["name"] for g in movie.get("genres", [])],
        "poster_url": f"https://image.tmdb.org/t/p/w500{movie['poster_path']}" if movie.get("poster_path") else None,
        "rated": None,
        "released": movie.get("release_date"),
        "runtime": f"{movie.get('runtime')} min" if movie.get("runtime") else None,
        "director": {
            "tmdb_id": director_data.get("id") if director_data else None,
            "name": director_data.get("name") if director_data else None,
            "profile_path": director_data.get("profile_path") if director_data else None,
        } if director_data else None,
        "box_office": None,
        "production": None,
        "website": None,
        "type": "movie",
        "plot": movie.get("overview"),
        "rating": movie.get("vote_average"),
        "trailer_url": trailer_url,
        "actors": actors
    }
