from typing import Optional, List

from pydantic import BaseModel

from app.models.movie import Movie
from app.schemas.genre import GenreResponse, genre_to_response


class MovieBase(BaseModel):
    tmdb_id: int
    title: str
    year: Optional[int] = None
    genres: Optional[List[str]] = None
    poster_url: Optional[str] = None
    rated: Optional[str] = None
    released: Optional[str] = None
    runtime: Optional[str] = None
    box_office: Optional[str] = None
    production: Optional[str] = None
    website: Optional[str] = None
    type: Optional[str] = None
    plot: Optional[str] = None
    rating: Optional[float] = None
    trailer_url: Optional[str] = None

class MovieCreate(MovieBase):
    pass

class MovieResponse(MovieBase):
    id: str

class MovieListResponse(BaseModel):
    id: int
    tmdb_id: int
    title: str
    poster_url: Optional[str] = None
    rating: Optional[float] = None
    type: Optional[str] = None

class MovieSearchResponse(BaseModel):
    tmdb_id: int
    title: str
    rating: Optional[float] = None
    year: Optional[int] = None
    poster_url: Optional[str] = None

def movie_to_response(movie: Movie) -> MovieResponse:
    return MovieResponse(
        id=str(movie.id),
        tmdb_id=movie.tmdb_id,
        title=movie.title,
        year=movie.year,
        genres=[g.name for g in movie.genres],
        poster_url=movie.poster_url,
        rated=movie.rated,
        released=movie.released,
        runtime=movie.runtime,
        box_office=movie.box_office,
        production=movie.production,
        website=movie.website,
        type=movie.type,
        plot=movie.plot,
        rating=movie.rating,
        trailer_url=movie.trailer_url,
    )

def movie_to_list_response(movie: Movie) -> MovieListResponse:
    return MovieListResponse(
        id=movie.id,
        tmdb_id=movie.tmdb_id,
        title=movie.title,
        poster_url=movie.poster_url,
        rating=movie.rating,
        type=movie.type,
    )