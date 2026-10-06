from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Path, Query, Request

from .client import TMDBClient, TMDBSettings
from .schemas import (CollectionDetail, Filmography, Genre, MovieCard, MovieDetail,
                      MovieSearchResult, PersonCard, PersonDetail)


router = APIRouter(prefix="/api/tmdb", tags=["TMDB catalogue"])


async def get_tmdb_client(request: Request) -> TMDBClient:
    return TMDBClient(TMDBSettings.from_env(request.scope.get("env")))


Client = Annotated[TMDBClient, Depends(get_tmdb_client)]
PositiveID = Annotated[int, Path(gt=0)]
Page = Annotated[int, Query(ge=1, le=500)]
Limit = Annotated[int, Query(ge=1, le=20)]


@router.get("/search/movie", response_model=list[MovieSearchResult])
async def search_movie(client: Client, q: Annotated[str, Query(min_length=2, max_length=200)],
                       page: Annotated[int, Query(ge=1, le=500)] = 1):
    return await client.search_movies(q, page)


@router.get("/movies", response_model=list[MovieCard])
async def movie_list(client: Client, kind: Literal["top-rated", "latest", "popular", "trending", "genre"],
                     page: Page = 1, limit: Limit = 10,
                     tmdb_genre_id: Annotated[int | None, Query(gt=0)] = None):
    return await client.movie_list(kind, page, limit, tmdb_genre_id)


@router.get("/movies/featured", response_model=list[MovieDetail])
async def featured_movies(client: Client, limit: Annotated[int, Query(ge=1, le=5)] = 5):
    return await client.featured_movies(limit)


@router.get("/genres", response_model=list[Genre])
async def genres(client: Client):
    return await client.genres()


@router.get("/collections", response_model=list[CollectionDetail])
async def collections(client: Client, random_one: bool = False):
    return await client.collections(random_one)


@router.get("/collection/{tmdb_collection_id}", response_model=CollectionDetail)
async def collection(tmdb_collection_id: PositiveID, client: Client):
    return await client.collection(tmdb_collection_id)


@router.get("/people/featured", response_model=list[PersonCard])
async def featured_people(client: Client):
    return await client.featured_people()


@router.get("/movie/{tmdb_movie_id}/recommendations", response_model=list[MovieCard])
async def related_movies(tmdb_movie_id: PositiveID, client: Client):
    return await client.related_movies(tmdb_movie_id)


@router.get("/person/{tmdb_person_id}/filmography", response_model=Filmography)
async def filmography(tmdb_person_id: PositiveID, client: Client):
    return await client.filmography(tmdb_person_id)


@router.get("/person/{tmdb_person_id}/related", response_model=list[PersonCard])
async def related_people(tmdb_person_id: PositiveID, client: Client):
    return await client.related_people(tmdb_person_id)


@router.get("/movie/{tmdb_movie_id}", response_model=MovieDetail)
async def movie_detail(tmdb_movie_id: PositiveID, client: Client):
    return await client.movie_detail(tmdb_movie_id)


@router.get("/person/{tmdb_person_id}", response_model=PersonDetail)
async def person_detail(tmdb_person_id: PositiveID, client: Client):
    return await client.person_detail(tmdb_person_id)
