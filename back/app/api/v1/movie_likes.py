from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.deps.auth import get_current_user
from app.services.postgres.like_service import (
    is_movie_liked,
    like_movie,
    list_user_likes,
    unlike_movie,
)

router = APIRouter(prefix="/movies", tags=["Movie likes"])


@router.post("/{tmdb_movie_id}/like")
def like_tmdb_movie(
    tmdb_movie_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    like_movie(db, current_user.id, tmdb_movie_id)
    return {"detail": "Movie liked"}


@router.delete("/{tmdb_movie_id}/like")
def unlike_tmdb_movie(
    tmdb_movie_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    unlike_movie(db, current_user.id, tmdb_movie_id)
    return {"detail": "Movie unliked"}


@router.get("/likes", response_model=list[int])
def get_user_likes(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return list_user_likes(db, current_user.id)


@router.get("/{tmdb_movie_id}/like")
def get_movie_like_state(
    tmdb_movie_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return {
        "tmdb_movie_id": tmdb_movie_id,
        "liked": is_movie_liked(db, current_user.id, tmdb_movie_id),
    }
