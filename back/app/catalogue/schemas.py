from pydantic import BaseModel, Field


class MovieSearchResult(BaseModel):
    tmdb_id: int = Field(gt=0)
    title: str
    rating: float | None = None
    year: int | None = None
    poster_url: str | None = None


class MovieDetail(BaseModel):
    tmdb_id: int = Field(gt=0)
    title: str
    overview: str | None = None
    release_date: str | None = None
    runtime: int | None = None
    vote_average: float | None = None
    poster_path: str | None = None
    backdrop_path: str | None = None
    tagline: str | None = None


class PersonDetail(BaseModel):
    tmdb_id: int = Field(gt=0)
    name: str
    biography: str | None = None
    birthday: str | None = None
    deathday: str | None = None
    place_of_birth: str | None = None
    profile_path: str | None = None
    known_for_department: str | None = None
