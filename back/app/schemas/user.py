from datetime import date
from typing import Optional

from neo4j.graph import Node
from pydantic import BaseModel, EmailStr, Field, field_validator
import neo4j.time


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    birthdate: date
    bio: Optional[str]
    favorite_genres: Optional[list[str]] = Field(default_factory=list)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    username: str
    email: EmailStr
    birthdate: date
    bio: Optional[str]
    favorite_genres: Optional[list[str]]

    @field_validator("birthdate", mode="before")
    @classmethod
    def convert_neo4j_date(cls, value):
        if isinstance(value, neo4j.time.Date):
            return date.fromisoformat(str(value))
        return value

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

def user_node_to_response(node: Node) -> UserResponse:
    return UserResponse(
        username=node["username"],
        email=node["email"],
        birthdate=node["birthdate"],
        bio=node.get("bio", ""),
        favorite_genres=node.get("favorite_genres", [])
    )