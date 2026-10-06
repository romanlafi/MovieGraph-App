"""Three read-only TMDB operations. No legacy config, ORM or persistence."""

import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
import json
import logging
import os
import sys
from urllib.parse import urlencode

from pydantic import ValidationError

from .schemas import MovieDetail, MovieSearchResult, PersonDetail


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
        return await self._detail("movie", tmdb_movie_id, MovieDetail)

    async def person_detail(self, tmdb_person_id: int) -> PersonDetail:
        return await self._detail("person", tmdb_person_id, PersonDetail)
