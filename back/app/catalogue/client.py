"""Read-only TMDB catalogue. No legacy config, ORM or persistence."""

import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
import json
import logging
import os
import sys
from datetime import datetime, timezone
from random import sample, choice
from urllib.parse import urlencode

from pydantic import ValidationError

from .schemas import (CollectionDetail, CollectionSummary, Filmography, Genre,
                      MovieCard, MovieDetail, MovieSearchResult, PersonCard, PersonDetail)


class TMDBError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


@dataclass(frozen=True)
class TMDBSettings:
    api_key: str = field(default="", repr=False)
    read_token: str = field(default="", repr=False)
    base_url: str = "https://api.themoviedb.org/3"

    @classmethod
    def from_env(cls, env=None):
        # ASGI provides Worker bindings per request; never copy secrets globally.
        def value(name: str, default: str = "") -> str:
            if env is None:
                return os.environ.get(name, default).strip()
            if isinstance(env, dict):
                return str(env.get(name, default)).strip()
            return str(getattr(env, name, default)).strip()

        return cls(value("TMDB_API_KEY"), value("TMDB_READ_ACCESS_TOKEN"),
                   value("TMDB_BASE_URL", cls.base_url).rstrip("/"))


Transport = Callable[[str, dict[str, str], float], Awaitable[tuple[int, str]]]
TIMEOUT_SECONDS = 10.0


async def worker_get(url: str, headers: dict[str, str], timeout: float) -> tuple[int, str]:
    from js import AbortController
    from workers import fetch

    controller = AbortController.new()
    try:
        async with asyncio.timeout(timeout):
            # Workers supports follow/manual, not error. Return redirects to
            # _get so they are rejected without forwarding credentials elsewhere.
            response = await fetch(url, headers=headers, signal=controller.signal,
                                   redirect="manual")
            return response.status, await response.text()
    except TimeoutError:
        raise TMDBError(504, "TMDB request timed out") from None
    except Exception as exc:
        # JS transport errors can contain the authenticated URL. Never forward it.
        logging.getLogger(__name__).warning("TMDB Worker transport failed (%s)", type(exc).__name__)
        raise TMDBError(502, "TMDB is unavailable") from None
    finally:
        controller.abort()


async def local_get(url: str, headers: dict[str, str], timeout: float) -> tuple[int, str]:
    import httpx

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
            response = await client.get(url, headers=headers)
            return response.status_code, response.text
    except httpx.TimeoutException:
        raise TMDBError(504, "TMDB request timed out") from None
    except httpx.RequestError:
        raise TMDBError(502, "TMDB is unavailable") from None


class TMDBClient:
    def __init__(self, settings: TMDBSettings, transport: Transport | None = None):
        self.settings = settings
        self.transport = transport or (worker_get if sys.platform == "emscripten" else local_get)

    async def _get(self, path: str, **params) -> dict:
        headers = {"Accept": "application/json"}
        if self.settings.read_token:
            headers["Authorization"] = f"Bearer {self.settings.read_token}"
        elif self.settings.api_key:
            params["api_key"] = self.settings.api_key
        else:
            raise TMDBError(503, "TMDB credential is not configured")
        url = f"{self.settings.base_url}{path}?{urlencode(params)}"
        status, body = await self.transport(url, headers, TIMEOUT_SECONDS)
        if status == 404:
            raise TMDBError(404, "TMDB resource not found")
        if status == 429:
            raise TMDBError(503, "TMDB rate limit reached")
        if status != 200:
            raise TMDBError(502, "TMDB upstream request failed")
        try:
            data = json.loads(body)
            if not isinstance(data, dict):
                raise ValueError
            return data
        except ValueError:
            raise TMDBError(502, "Invalid TMDB response") from None

    async def search_movies(self, query: str, page: int = 1) -> list[MovieSearchResult]:
        query = query.strip()
        if not 2 <= len(query) <= 200 or not 1 <= page <= 500:
            raise TMDBError(422, "Query must contain 2–200 characters and page must be 1–500")
        data = await self._get("/search/movie", query=query, page=page, include_adult="false")
        try:
            # Preserve the existing autocomplete selection and five-result limit.
            results = data["results"]
            if not isinstance(results, list):
                raise ValueError
            selected = [m for m in results if m.get("poster_path") and m.get("vote_average")
                        and m.get("overview") is not None][:5]
            return [MovieSearchResult(
                tmdb_id=m["id"], title=m["title"], rating=m["vote_average"],
                year=int(m["release_date"][:4]) if m.get("release_date") else None,
                poster_url=m["poster_path"],
            ) for m in selected]
        except (KeyError, TypeError, ValueError, AttributeError):
            raise TMDBError(502, "Invalid TMDB response") from None

    async def _detail(self, resource: str, tmdb_id: int, schema):
        if tmdb_id <= 0:
            raise TMDBError(422, "TMDB ID must be positive")
        data = await self._get(f"/{resource}/{tmdb_id}")
        try:
            result = schema.model_validate({**data, "tmdb_id": data["id"]})
            if result.tmdb_id != tmdb_id:
                raise ValueError
            return result
        except (KeyError, ValueError, ValidationError):
            raise TMDBError(502, "Invalid TMDB response") from None

    async def movie_detail(self, tmdb_movie_id: int) -> MovieDetail:
        if tmdb_movie_id <= 0:
            raise TMDBError(422, "TMDB ID must be positive")
        data = await self._get(f"/movie/{tmdb_movie_id}", append_to_response="credits,videos")
        try:
            credits = data.get("credits", {"cast": [], "crew": []})
            crew = credits["crew"]
            directors = [person for person in crew if person.get("job") == "Director"]
            videos = data.get("videos", {}).get("results", [])
            trailers = [video for video in videos if video.get("site") == "YouTube"
                        and video.get("type") == "Trailer" and video.get("key")]
            collection = data.get("belongs_to_collection")
            result = MovieDetail.model_validate({
                **data, "tmdb_id": data["id"],
                "genres": [{"tmdb_id": genre["id"], "name": genre["name"]}
                           for genre in data.get("genres", [])],
                "collection": self._collection_summary(collection) if collection else None,
                "cast": self._people(credits),
                "director": ", ".join(person["name"] for person in directors) or None,
                "trailer_youtube_key": trailers[0]["key"] if trailers else None,
            })
            if result.tmdb_id != tmdb_movie_id:
                raise ValueError
            return result
        except (KeyError, TypeError, ValueError, AttributeError):
            raise TMDBError(502, "Invalid TMDB response") from None

    async def person_detail(self, tmdb_person_id: int) -> PersonDetail:
        return await self._detail("person", tmdb_person_id, PersonDetail)

    @staticmethod
    def _movies(rows: list[dict]) -> list[MovieCard]:
        try:
            if not isinstance(rows, list):
                raise ValueError
            return [MovieCard.model_validate({**row, "tmdb_id": row["id"]}) for row in rows]
        except (KeyError, TypeError, ValueError):
            raise TMDBError(502, "Invalid TMDB response") from None

    @staticmethod
    def _people(credits: dict) -> list[PersonCard]:
        try:
            people = {}
            for person in credits["cast"]:
                people.setdefault(person["id"], PersonCard.model_validate({
                    **person, "tmdb_id": person["id"], "role": "ACTOR",
                }))
            for person in credits["crew"]:
                if person.get("job") == "Director":
                    if person["id"] in people:
                        people[person["id"]].role = "ACTOR, DIRECTOR"
                    else:
                        people[person["id"]] = PersonCard.model_validate({
                            **person, "tmdb_id": person["id"], "role": "DIRECTOR",
                        })
            return list(people.values())
        except (KeyError, TypeError, ValueError):
            raise TMDBError(502, "Invalid TMDB response") from None

    @staticmethod
    def _collection_summary(data: dict) -> CollectionSummary:
        return CollectionSummary.model_validate({**data, "tmdb_id": data["id"]})

    async def movie_list(self, kind: str, page: int = 1, limit: int = 10,
                         tmdb_genre_id: int | None = None) -> list[MovieCard]:
        paths = {"top-rated": "/movie/top_rated", "popular": "/movie/popular",
                 "latest": "/discover/movie", "genre": "/discover/movie",
                 "trending": "/trending/movie/week"}
        if kind not in paths or not 1 <= page <= 500 or not 1 <= limit <= 20:
            raise TMDBError(422, "Invalid movie list or pagination")
        params = {}
        if kind == "latest":
            params = {"sort_by": "primary_release_date.desc", "include_adult": "false",
                      "primary_release_date.lte": datetime.now(timezone.utc).date().isoformat(),
                      "vote_count.gte": 10}
        if kind == "genre":
            if tmdb_genre_id is None or tmdb_genre_id <= 0:
                raise TMDBError(422, "TMDB genre ID must be positive")
            params = {"with_genres": tmdb_genre_id, "sort_by": "title.asc", "include_adult": "false"}
        offset = (page - 1) * limit
        first_page = offset // 20 + 1
        last_page = (offset + limit - 1) // 20 + 1
        batches = await asyncio.gather(*[
            self._get(paths[kind], page=upstream_page, **params)
            for upstream_page in range(first_page, last_page + 1)
        ])
        try:
            rows = [movie for batch in batches for movie in self._movies(batch["results"])]
            start = offset % 20
            return rows[start:start + limit]
        except (KeyError, TypeError):
            raise TMDBError(502, "Invalid TMDB response") from None

    async def genres(self) -> list[Genre]:
        data = await self._get("/genre/movie/list")
        try:
            return [Genre(tmdb_id=genre["id"], name=genre["name"]) for genre in data["genres"]]
        except (KeyError, TypeError, ValueError):
            raise TMDBError(502, "Invalid TMDB response") from None

    async def featured_movies(self, limit: int = 5) -> list[MovieDetail]:
        pool = await self.movie_list("trending", limit=20)
        candidates = [movie for movie in pool if movie.backdrop_path]
        results = await asyncio.gather(*[self.movie_detail(movie.tmdb_id)
                                        for movie in sample(candidates, min(limit, len(candidates)))],
                                       return_exceptions=True)
        movies = [result for result in results if isinstance(result, MovieDetail)]
        if not movies and results:
            raise TMDBError(502, "Featured movies are unavailable")
        return movies

    async def related_movies(self, tmdb_movie_id: int) -> list[MovieCard]:
        data = await self._get(f"/movie/{tmdb_movie_id}/recommendations", page=1)
        try:
            return self._movies(data["results"])
        except KeyError:
            raise TMDBError(502, "Invalid TMDB response") from None

    async def collection(self, tmdb_collection_id: int) -> CollectionDetail:
        data = await self._get(f"/collection/{tmdb_collection_id}")
        try:
            summary = self._collection_summary(data)
            if summary.tmdb_id != tmdb_collection_id:
                raise ValueError
            movies = sorted(self._movies(data["parts"]), key=lambda movie: movie.release_date or "9999")
            return CollectionDetail(**summary.model_dump(), movies=movies)
        except (KeyError, TypeError, ValueError):
            raise TMDBError(502, "Invalid TMDB response") from None

    async def collections(self, random_one: bool = False) -> list[CollectionDetail]:
        collection_ids = (8091, 10, 1241, 119, 86311, 528, 645, 9485)
        selected = (choice(collection_ids),) if random_one else collection_ids
        results = await asyncio.gather(*[self.collection(tmdb_id) for tmdb_id in selected],
                                       return_exceptions=True)
        collections = [result for result in results if isinstance(result, CollectionDetail)]
        if not collections:
            raise TMDBError(502, "Featured collections are unavailable")
        return collections

    async def featured_people(self) -> list[PersonCard]:
        data = await self._get("/person/popular", page=1)
        try:
            people = [PersonCard.model_validate({**person, "tmdb_id": person["id"]})
                      for person in data["results"] if person.get("profile_path") and not person.get("adult")]
            return sample(people, min(15, len(people)))
        except (KeyError, TypeError, ValueError, AttributeError):
            raise TMDBError(502, "Invalid TMDB response") from None

    async def filmography(self, tmdb_person_id: int) -> Filmography:
        data = await self._get(f"/person/{tmdb_person_id}/movie_credits")
        try:
            def unique(rows: list[dict]) -> list[MovieCard]:
                return list({movie.tmdb_id: movie for movie in self._movies(rows)}.values())
            return Filmography(acted=unique(data["cast"]),
                               directed=unique([movie for movie in data["crew"] if movie.get("job") == "Director"]))
        except (KeyError, TypeError, AttributeError):
            raise TMDBError(502, "Invalid TMDB response") from None

    async def related_people(self, tmdb_person_id: int) -> list[PersonCard]:
        filmography = await self.filmography(tmdb_person_id)
        movies = {movie.tmdb_id: movie for movie in filmography.acted + filmography.directed}
        selected = sorted(movies.values(), key=lambda movie: movie.vote_average or 0, reverse=True)[:3]
        batches = await asyncio.gather(*[self._get(f"/movie/{movie.tmdb_id}/credits") for movie in selected],
                                       return_exceptions=True)
        people = {}
        appearances = {}
        for batch in batches:
            if isinstance(batch, Exception):
                continue
            for person in self._people(batch):
                if person.tmdb_id != tmdb_person_id:
                    people.setdefault(person.tmdb_id, person)
                    appearances[person.tmdb_id] = appearances.get(person.tmdb_id, 0) + 1
        if batches and all(isinstance(batch, Exception) for batch in batches):
            raise TMDBError(502, "Related people are unavailable")
        return sorted(people.values(), key=lambda person: (-appearances[person.tmdb_id], person.tmdb_id))[:15]
