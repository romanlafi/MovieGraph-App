from typing import Optional, List

from pydantic import BaseModel

from app.models.movie import Movie
from app.schemas.genre import GenreResponse, genre_to_response

class MovieListResponse(BaseModel):
    id: int
    tmdb_id: int
    title: str
    tagline: Optional[str] = None
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    rating: Optional[float] = None
    year: Optional[int] = None
    director: Optional[str] = None

class CollectionResponse(BaseModel):
    id: int
    tmdb_id: int
    name: str
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    movies: Optional[List[MovieListResponse]] = None

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
    tagline: Optional[str]
    backdrop_url: Optional[str]
    origin_country: Optional[str]
    collection: Optional[CollectionResponse] = None

class MovieCreate(MovieBase):
    pass

class MovieResponse(MovieBase):
    id: str

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
        released=movie.released,
        runtime=movie.runtime,
        box_office=movie.box_office,
        website=movie.website,
        plot=movie.plot,
        rating=movie.rating,
        trailer_url=movie.trailer_url,
        tagline=movie.tagline,
        backdrop_url=movie.backdrop_url,
        origin_country=movie.origin_country,
        collection=CollectionResponse(
            id=movie.collection.id,
            tmdb_id=movie.collection.tmdb_id,
            name=movie.collection.name,
            poster_url=movie.collection.poster_url,
            backdrop_url=movie.collection.backdrop_url
        ) if movie.collection else None
    )

def movie_to_list_response(movie: Movie) -> MovieListResponse:
    return MovieListResponse(
        id=movie.id,
        tmdb_id=movie.tmdb_id,
        title=movie.title,
        tagline=movie.tagline,
        poster_url=movie.poster_url,
        backdrop_url=movie.backdrop_url,
        rating=movie.rating,
        year=movie.year,
        director=movie.movie_persons[0].person.name if movie.movie_persons[0] else None,
    )

