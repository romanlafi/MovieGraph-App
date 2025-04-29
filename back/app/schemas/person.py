from typing import Optional

from neo4j.graph import Node
from pydantic import BaseModel

class PersonBase(BaseModel):
    name: str

class PersonResponse(PersonBase):
    tmdb_id: int
    name: str
    photo_url: Optional[str] = None

class PersonWithRoleResponse(BaseModel):
    tmdb_id: int
    name: str
    photo_url: Optional[str] = None
    role: str


def person_node_to_response(node: Node) -> PersonResponse:
    profile_path = node.get("profile_path")
    return PersonResponse(
        tmdb_id=node.get("tmdb_id"),
        name=node.get("name", ""),
        photo_url=f"https://image.tmdb.org/t/p/w500{profile_path}" if profile_path else None
    )