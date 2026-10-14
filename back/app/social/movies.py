"""Comments and likes linked to external TMDB movie IDs."""

from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.schemas.comment import CommentCreate, CommentResponse

from app.schemas.social import DetailResponse, MovieLikeState
from app.social.contracts import SocialUser
from app.social.repositories import movies as movie_repository
from app.social.dependencies import get_authenticated_user, get_social_session


router = APIRouter(prefix="/api/v1/movies", tags=["MovieGraph social"])


@router.get("/{tmdb_movie_id}/comments", response_model=list[CommentResponse])
async def list_comments(
    tmdb_movie_id: int = Path(gt=0),
    db: Session = Depends(get_social_session),
) -> list[CommentResponse]:
    return movie_repository.list_movie_comments(db, tmdb_movie_id)


@router.post("/{tmdb_movie_id}/comments", response_model=CommentResponse)
async def post_comment(
    comment: CommentCreate,
    tmdb_movie_id: int = Path(gt=0),
    user: SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
) -> CommentResponse:
    return movie_repository.create_comment(db, user, tmdb_movie_id, comment.text)


@router.get("/likes", response_model=list[int])
async def my_likes(
    user: SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
) -> list[int]:
    return movie_repository.list_user_likes(db, user.id)


@router.get("/{tmdb_movie_id}/like", response_model=MovieLikeState)
async def like_state(
    tmdb_movie_id: int = Path(gt=0),
    user: SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
) -> MovieLikeState:
    return MovieLikeState(
        tmdb_movie_id=tmdb_movie_id,
        liked=movie_repository.is_movie_liked(db, user.id, tmdb_movie_id),
    )


@router.post("/{tmdb_movie_id}/like", response_model=DetailResponse)
async def like_movie(
    tmdb_movie_id: int = Path(gt=0),
    user: SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
) -> DetailResponse:
    movie_repository.like_movie(db, user.id, tmdb_movie_id)
    return DetailResponse(detail="Movie liked")


@router.delete("/{tmdb_movie_id}/like", response_model=DetailResponse)
async def unlike_movie(
    tmdb_movie_id: int = Path(gt=0),
    user: SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
) -> DetailResponse:
    movie_repository.unlike_movie(db, user.id, tmdb_movie_id)
    return DetailResponse(detail="Movie unliked")
