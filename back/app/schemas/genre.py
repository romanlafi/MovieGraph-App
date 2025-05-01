from pydantic import BaseModel

from app.models.genre import Genre


class GenreResponse(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True

def genre_to_response(genre: Genre) -> GenreResponse:
    return GenreResponse(id=genre.id, name=genre.name)