from pydantic import BaseModel, EmailStr


class FriendRequest(BaseModel):
    email: EmailStr

class FriendResponse(BaseModel):
    email: EmailStr
    username: str

    class Config:
        from_attributes = True