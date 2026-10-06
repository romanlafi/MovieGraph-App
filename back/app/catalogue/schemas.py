from pydantic import BaseModel, Field


class MovieSearchResult(BaseModel):
    tmdb_id: int = Field(gt=0)
    title: str
    rating: float | None = None
    year: int | None = None
    poster_url: str | None = None


class Genre(BaseModel):
    tmdb_id: int = Field(gt=0)
    name: str


class MovieCard(BaseModel):
    tmdb_id: int = Field(gt=0)
    title: str
    release_date: str | None = None
    vote_average: float | None = None
    poster_path: str | None = None
    backdrop_path: str | None = None


class CollectionSummary(BaseModel):
    tmdb_id: int = Field(gt=0)
    name: str
    poster_path: str | None = None
    backdrop_path: str | None = None


class CollectionDetail(CollectionSummary):
    movies: list[MovieCard] = Field(default_factory=list)


class PersonCard(BaseModel):
    tmdb_id: int = Field(gt=0)
    name: str
    profile_path: str | None = None
    role: str | None = None
    character: str | None = None


class Filmography(BaseModel):
    acted: list[MovieCard]
    directed: list[MovieCard]


class MovieDetail(MovieCard):
    overview: str | None = None
    runtime: int | None = None
    tagline: str | None = None
    revenue: int | None = None
    homepage: str | None = None
    origin_country: list[str] = Field(default_factory=list)
    genres: list[Genre] = Field(default_factory=list)
    collection: CollectionSummary | None = None
    cast: list[PersonCard] = Field(default_factory=list)
    director: str | None = None
    trailer_youtube_key: str | None = None


class PersonDetail(BaseModel):
    tmdb_id: int = Field(gt=0)
    name: str
    biography: str | None = None
    birthday: str | None = None
    deathday: str | None = None
    place_of_birth: str | None = None
    profile_path: str | None = None
    known_for_department: str | None = None
