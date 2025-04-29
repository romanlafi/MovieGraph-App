from neo4j.graph import Node
from pydantic import BaseModel
from typing import Optional, List


class MovieBase(BaseModel):
    title: str
    tmdb_id: int
    year: Optional[int] = None
    genres: Optional[List[str]] = []
    poster_url: Optional[str] = None
    rated: Optional[str] = None
    released: Optional[str] = None
    runtime: Optional[str] = None
    director: Optional[str] = None
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
    tmdb_id: int
    title: str
    poster_url: Optional[str] = None
    # year: Optional[int] = None
    #director: Optional[str] = None
    rating: Optional[float] = None
    type: Optional[str] = None

def movie_node_to_response(node: Node) -> MovieResponse:
    return MovieResponse(
        id=str(node.id),
        tmdb_id=node.get("tmdb_id"),
        title=node.get("title"),
        year=node.get("year"),
        genres=node.get("genres", []),
        poster_url=node.get("poster_url"),
        rated=node.get("rated"),
        released=node.get("released"),
        runtime=node.get("runtime"),
        director=node.get("director"),
        box_office=node.get("box_office"),
        production=node.get("production"),
        website=node.get("website"),
        type=node.get("type"),
        plot=node.get("plot"),
        rating=node.get("rating"),
        trailer_url=node.get("trailer_url")
    )


def movie_node_to_list_response(node: Node) -> MovieListResponse:
    return MovieListResponse(
        tmdb_id=node.get("tmdb_id"),
        title=node.get("title"),
        poster_url=node.get("poster_url"),
        # year=node.get("year"),
        # director=node.get("director"),
        rating=node.get("rating"),
        type=node.get("type")
    )