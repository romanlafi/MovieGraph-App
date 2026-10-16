from datetime import date

from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class UserRegistration(BaseModel):
    username: str = Field(min_length=2, max_length=40)
    email: EmailStr
    password: str = Field(min_length=12, max_length=72)
    birthdate: date
    bio: str | None = Field(default=None, max_length=500)
    favorite_genres: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, password: str) -> str:
        if "\x00" in password:
            raise ValueError("Password must not contain null characters")
        if len(password.encode("utf-8")) > 72:
            raise ValueError("Password must not exceed 72 UTF-8 bytes")
        return password

    @field_validator("favorite_genres")
    @classmethod
    def genre_names_are_bounded(cls, genres: list[str]) -> list[str]:
        if any(not genre.strip() or len(genre) > 40 for genre in genres):
            raise ValueError("Each genre must contain between 1 and 40 characters")
        return genres


class RegistrationResult(BaseModel):
    email: EmailStr
    username: str


class UserProfile(BaseModel):
    public_id: UUID
    email: EmailStr
    username: str
    birthdate: date | None
    bio: str | None
    favorite_genres: list[str]


class UserResponse(BaseModel):
    public_id: UUID
    username: str
    bio: str | None
    favorite_genres: list[str]


class FollowRequest(BaseModel):
    public_id: UUID | None = None
    email: EmailStr | None = None

    @model_validator(mode="after")
    def requires_one_identifier(self) -> "FollowRequest":
        if (self.public_id is None) == (self.email is None):
            raise ValueError("Provide exactly one of public_id or email")
        return self


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
