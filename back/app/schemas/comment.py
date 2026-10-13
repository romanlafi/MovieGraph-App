from pydantic import BaseModel, Field
from datetime import datetime

class CommentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)

class CommentResponse(BaseModel):
    comment_id: int
    username: str
    text: str
    created_at: datetime
