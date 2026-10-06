from typing import List

from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.deps.auth import get_current_user
from app.schemas.comment import CommentCreate, CommentResponse
from app.services.postgres.comment_service import create_comment, list_movie_comments

router = APIRouter(tags=["Comments"])

@router.post("/movies/{tmdb_movie_id}/comments", response_model=CommentResponse)
def comment_movie(
    comment: CommentCreate,
    tmdb_movie_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return create_comment(db, current_user.email, tmdb_movie_id, comment)


@router.get("/movies/{tmdb_movie_id}/comments", response_model=List[CommentResponse])
def get_movie_comments(
    tmdb_movie_id: int = Path(..., gt=0),
    db: Session = Depends(get_db)
):
    return list_movie_comments(db, tmdb_movie_id)
