from typing import List

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.deps.auth import get_current_user
from app.schemas.comment import CommentCreate, CommentResponse
from app.services.postgres.comment_service import create_comment, list_movie_comments

router = APIRouter(prefix="/comments", tags=["Comments"])

@router.post("/", response_model=CommentResponse)
def comment_movie(
    comment: CommentCreate = Body(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return create_comment(db, current_user.email, comment)


@router.get("/", response_model=List[CommentResponse])
def get_movie_comments(
    movie_id: int = Query(...),
    db: Session = Depends(get_db)
):
    return list_movie_comments(db, movie_id)