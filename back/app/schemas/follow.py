from pydantic import BaseModel, EmailStr


class FollowRequest(BaseModel):
    email: EmailStr