import os
from http import HTTPStatus
from typing import List

import httpx
from dotenv import load_dotenv

load_dotenv()

OMDB_API_KEY = os.getenv("OMDB_API_KEY")
BASE_URL = os.getenv("OMDB_BASE_URL")

def call_omdb(params: dict) -> dict | None:
    params["apikey"] = OMDB_API_KEY
    response = httpx.get(BASE_URL, params=params)

    if response.status_code != HTTPStatus.OK:
        return None

    data = response.json()
    return data if data.get("Response") == "True" else None

def search_movies_omdb(query: str, page: int = 1) -> List[dict]:
    data = call_omdb({"s": query, "page": page})
    return data.get("Search", []) if data else []

def fetch_movie_data_by_imdb(imdb_id: str) -> dict | None:
    data = call_omdb({"i": imdb_id})
    if not data:
        return None

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
        "actors": data.get("Actors", "").split(", "),
        "imdb_rating": parse_imdb_rating(data.get("Ratings", [])),
        "box_office": data.get("BoxOffice"),
        "production": data.get("Production"),
        "website": data.get("Website"),
        "type": data.get("Type"),
        "plot": data.get("Plot")
    }

def clean_year(raw: str) -> int | None:
    if not raw:
        return None
    try:
        clean = raw.strip().split("–")[0].split("-")[0]
        return int(clean) if clean.isdigit() else None
    except Exception:
        return None

def parse_imdb_rating(ratings: list[dict]) -> float | None:
    for rating in ratings:
        if rating.get("Source") == "Internet Movie Database":
            try:
                return float(rating["Value"].split("/")[0])
            except:
                return None
    return None
