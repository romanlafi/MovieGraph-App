from typing import List

from fastapi import APIRouter, Body, Depends, Query

from app.deps.auth import get_current_user
from app.schemas.comment import CommentCreate, CommentResponse
from app.services.comment_service import create_comment, list_comments

router = APIRouter(prefix="/comments", tags=["Comments"])

@router.post("/")
def comment_movie(
    comment: CommentCreate = Body(...),
    current_user=Depends(get_current_user)
):
    create_comment(comment.tmdb_id, current_user["email"], comment.text)
    return {"detail": "Comment created successfully."}

@router.get("/", response_model=List[CommentResponse])
def get_movie_comments(tmdb_id: int = Query(...)):
    return list_comments(tmdb_id)