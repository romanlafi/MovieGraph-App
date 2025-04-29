from typing import List

from neo4j.graph import Node

from app.exceptions import MovieNotFoundError, UserNotFoundError, GenreNotFoundError
from app.graph.queries.movie import (
    create_movie_node,
    search_movies_in_neo4j,
    like_movie_by_imdb_id,
    unlike_movie_by_imdb_id,
    get_liked_movies,
    get_all_genres,
    search_movies_by_genre,
    get_movie_by_tmdb_id,
    get_related_movies_by_people_and_genres
)
from app.graph.queries.person import create_relationship, create_person_with_tmdb
from app.graph.queries.user import get_user_by_email
from app.schemas.movie import (
    MovieResponse,
    MovieListResponse,
    movie_node_to_response,
    movie_node_to_list_response
    )
from app.services.tmdb_service import search_movies_tmdb, fetch_movie_data_by_tmdb


def search_movies(query: str, page: int = 1, limit: int = 10) -> List[MovieListResponse]:
    skip = (page - 1) * limit
    results = []

    local_nodes = search_movies_in_neo4j(query, skip, limit)
    results.extend([movie_node_to_list_response(n) for n in local_nodes])

    if len(results) >= limit:
        return results[:limit]

    seen_titles = {r.title.lower() for r in results}
    tmdb_page = 1

    while len(results) < limit:
        tmdb_results = search_movies_tmdb(query, page=tmdb_page)
        if not tmdb_results:
            break

        for item in tmdb_results:
            title = item.get("title")
            tmdb_id = item.get("id")
            if not title or title.lower() in seen_titles:
                continue

            data = fetch_movie_data_by_tmdb(tmdb_id)
            if not data or not data.get("poster_url"):
                continue

            node = register_movie_from_data(data)
            if node:
                results.append(movie_node_to_list_response(node))
                seen_titles.add(title.lower())

            if len(results) >= limit:
                break

        tmdb_page += 1

    return results

def search_by_genre(genre: str, page: int, limit: int) -> List[MovieListResponse]:
    skip = (page - 1) * limit
    if not genre in list_all_genres():
        raise GenreNotFoundError()
    movies = search_movies_by_genre(genre, skip, limit)
    return [movie_node_to_list_response(m) for m in movies]

def register_movie_from_data(data: dict) -> Node | None:
    if not data.get("title") or not data.get("tmdb_id"):
        return None

    node = create_movie_node(
        tmdb_id=data["tmdb_id"],
        title=data["title"],
        year=data.get("year"),
        genres=data.get("genres"),
        poster_url=data.get("poster_url"),
        rated=data.get("rated"),
        released=data.get("released"),
        runtime=data.get("runtime"),
        director=data["director"]["name"] if data.get("director") else None,
        box_office=data.get("box_office"),
        production=data.get("production"),
        website=data.get("website"),
        type=data.get("type"),
        plot=data.get("plot"),
        rating=data.get("rating"),
        trailer_url=data.get("trailer_url")
    )

    if not node:
        return None

    # Relación con actores
    for actor in data.get("actors", []):
        create_person_with_tmdb(actor["tmdb_id"], actor["name"], actor["profile_path"])
        create_relationship(actor["tmdb_id"], data["tmdb_id"], "ACTED_IN")

    # Relación con director
    if data.get("director"):
        d = data["director"]
        create_person_with_tmdb(d["tmdb_id"], d["name"], d.get("profile_path"))
        create_relationship(d["tmdb_id"], data["tmdb_id"], "DIRECTED")

    return node

def get_movie_by_tmdb(tmdb_id: str) -> MovieResponse:
    node = get_movie_by_tmdb_id(tmdb_id)
    if not node:
        raise MovieNotFoundError()
    return movie_node_to_response(node)

def like_movie_by_imdb(user_email: str, movie_id: str):
    like_movie_by_imdb_id(user_email, movie_id)

def unlike_movie_by_imdb(user_email: str, movie_id: str):
    unlike_movie_by_imdb_id(user_email, movie_id)

def get_movies_liked_by_user(user_email: str) -> List[MovieListResponse]:
    if not get_user_by_email(user_email):
        raise UserNotFoundError()

    nodes = get_liked_movies(user_email)
    return [movie_node_to_list_response(n) for n in nodes]

def list_all_genres() -> List[str]:
    return get_all_genres()

def get_related_movies(tmdb_id: str) -> List[MovieListResponse]:
    nodes = get_related_movies_by_people_and_genres(tmdb_id)
    return [movie_node_to_list_response(node) for node in nodes]