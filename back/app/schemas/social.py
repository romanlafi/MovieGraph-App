from pydantic import BaseModel


class MovieLikeState(BaseModel):
    tmdb_movie_id: int
    liked: bool


class DetailResponse(BaseModel):
    detail: str
