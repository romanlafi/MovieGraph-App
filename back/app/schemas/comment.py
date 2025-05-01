from pydantic import BaseModel
from datetime import datetime

class CommentCreate(BaseModel):
    movie_id: int
    text: str

class CommentResponse(BaseModel):
    comment_id: int
    username: str
    text: str
    created_at: datetime