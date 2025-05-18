from typing import Optional
from pydantic import BaseModel


class PersonBase(BaseModel):
    name: str

class PersonResponse(PersonBase):
    id: int
    tmdb_id: int
    photo_url: Optional[str] = None
    biography: Optional[str] = None
    birthday: Optional[str] = None
    place_of_birth: Optional[str] = None

class PersonWithRoleResponse(PersonResponse):
    role: str
    character: Optional[str] = None