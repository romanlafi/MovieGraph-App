import asyncio
import httpx
from typing import List, Optional, Set
from app.graph.queries.movie import (
    search_movies_in_neo4j,
    get_movie_by_tmdb_id,
    create_movie_node
)
from app.schemas.movie import MovieListResponse, movie_node_to_list_response
from app.services.omdb_service import clean_year
import os

OMDB_API_KEY = os.getenv("OMDB_API_KEY")
BASE_URL = os.getenv("OMDB_BASE_URL")

async def fetch_movie_data_by_imdb_async(imdb_id: str) -> Optional[dict]:
    async with httpx.AsyncClient() as client:
        url = f"{BASE_URL}?apikey={OMDB_API_KEY}&i={imdb_id}"
        response = await client.get(url)
        if response.status_code == 200 and response.json().get("Response") == "True":
            data = response.json()
            return {
                "title": data.get("Title"),
                "year": clean_year(data.get("Year")),
                "genres": data.get("Genre", "").split(", "),
                "imdb_id": data.get("imdbID"),
                "poster_url": data.get("Poster"),
                "rated": data.get("Rated"),
                "released": data.get("Released"),
                "runtime": data.get("Runtime"),
                "director": data.get("Director"),
                "box_office": data.get("BoxOffice"),
                "production": data.get("Production"),
                "website": data.get("Website"),
                "type": data.get("Type"),
                "plot": data.get("Plot")
            }
    return None

async def register_movie_async(data: dict):
    if data and data.get("imdb_id") and not get_movie_by_tmdb_id(data["imdb_id"]):
        if data.get("type") in ("movie", "series") and data.get("url"):
            create_movie_node(data)

async def search_movies_async(query: str, page: int = 1, limit: int = 10) -> List[MovieListResponse]:
    skip = (page - 1) * limit
    results: List[MovieListResponse] = []

    local_nodes = search_movies_in_neo4j(query, skip, limit)
    results.extend([movie_node_to_list_response(n) for n in local_nodes])

    if len(results) >= limit:
        return results[:limit]

    needed = limit - len(results)
    seen_titles: Set[str] = {r.title.lower() for r in results}

    # Buscar en OMDB
    omdb_url = f"{BASE_URL}?apikey={OMDB_API_KEY}&s={query}&page={page}"
    async with httpx.AsyncClient() as client:
        response = await client.get(omdb_url)
    omdb_raw = response.json().get("Search", []) if response.status_code == 200 else []

    fetch_tasks = []
    title_map = {}

    for item in omdb_raw:
        title = item.get("Title")
        imdb_id = item.get("imdbID")

        if not title or not imdb_id or title.lower() in seen_titles:
            continue

        if get_movie_by_tmdb_id(imdb_id):
            continue

        task = fetch_movie_data_by_imdb_async(imdb_id)
        fetch_tasks.append(task)
        title_map[imdb_id] = title

        if len(fetch_tasks) >= needed * 2:  # amortiguación
            break

    fetch_results = await asyncio.gather(*fetch_tasks)

    for data in fetch_results:
        if not data:
            continue

        if data["title"].lower() in seen_titles:
            continue

        results.append(movie_node_to_list_response(data))
        seen_titles.add(data["title"].lower())

        # Registro en segundo plano
        asyncio.create_task(register_movie_async(data))

        if len(results) >= limit:
            break

    return results
