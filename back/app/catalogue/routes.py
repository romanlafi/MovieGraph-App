from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Request

from .client import TMDBClient, TMDBSettings
from .schemas import MovieDetail, MovieSearchResult, PersonDetail


router = APIRouter(prefix="/api/tmdb", tags=["TMDB catalogue"])


async def get_tmdb_client(request: Request) -> TMDBClient:
    return TMDBClient(TMDBSettings.from_env(request.scope.get("env")))


Client = Annotated[TMDBClient, Depends(get_tmdb_client)]
PositiveID = Annotated[int, Path(gt=0)]


@router.get("/search/movie", response_model=list[MovieSearchResult])
async def search_movie(client: Client, q: Annotated[str, Query(min_length=2, max_length=200)],
                       page: Annotated[int, Query(ge=1, le=500)] = 1):
    return await client.search_movies(q, page)


@router.get("/movie/{tmdb_movie_id}", response_model=MovieDetail)
async def movie_detail(tmdb_movie_id: PositiveID, client: Client):
    return await client.movie_detail(tmdb_movie_id)


@router.get("/person/{tmdb_person_id}", response_model=PersonDetail)
async def person_detail(tmdb_person_id: PositiveID, client: Client):
    return await client.person_detail(tmdb_person_id)
