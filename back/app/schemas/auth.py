from datetime import date

from pydantic import BaseModel, EmailStr, Field


class UserRegistration(BaseModel):
    username: str
    email: EmailStr
    password: str
    birthdate: date
    bio: str | None = None
    favorite_genres: list[str] = Field(default_factory=list)


class UserProfile(BaseModel):
    email: EmailStr
    username: str
    birthdate: date | None
    bio: str | None
    favorite_genres: list[str]


class UserResponse(UserProfile):
    id: int


class FollowRequest(BaseModel):
    email: EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
