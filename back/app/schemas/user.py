from datetime import date
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


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

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"