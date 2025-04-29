from pydantic import BaseModel, EmailStr


class FriendRequest(BaseModel):
    email: EmailStr