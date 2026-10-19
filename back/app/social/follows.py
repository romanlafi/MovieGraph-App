"""Authenticated user discovery and follow routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.schemas.auth import FollowRequest, UserResponse

from app.social.contracts import SocialUser
from app.social.repositories import accounts as account_repository
from app.social.repositories import follows as follow_repository
from app.social.dependencies import get_authenticated_user, get_social_session


router = APIRouter(prefix="/api/v1/follows", tags=["MovieGraph follows"])
USER_NOT_FOUND = "User not found"


@router.get("/search", response_model=list[UserResponse])
async def search_users(
    query: str = Query(..., min_length=2, max_length=80),
    user: SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
) -> list[UserResponse]:
    return account_repository.search_users(db, query, user.email)


@router.post("/")
async def follow_user(
    follow: FollowRequest,
    user: SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
) -> None:
    if follow.public_id is not None:
        result = follow_repository.follow_user_by_public_id(db, user.id, str(follow.public_id))
    else:
        result = follow_repository.follow_user(db, user.id, str(follow.email))
    if result is None:
        raise HTTPException(404, USER_NOT_FOUND)


@router.delete("/")
async def unfollow_user(
    follow: FollowRequest,
    user: SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
) -> None:
    if follow.public_id is not None:
        result = follow_repository.unfollow_user_by_public_id(db, user.id, str(follow.public_id))
    else:
        result = follow_repository.unfollow_user(db, user.id, str(follow.email))
    if result is None:
        raise HTTPException(404, USER_NOT_FOUND)


@router.get("/following", response_model=list[UserResponse])
async def get_my_following(
    user: SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
) -> list[UserResponse]:
    return follow_repository.list_following(db, user.id)


@router.get("/followers", response_model=list[UserResponse])
async def get_my_followers(
    user: SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
) -> list[UserResponse]:
    return follow_repository.list_followers(db, user.id)


@router.get("/movie-likes", response_model=list[int])
async def get_followed_movie_likes(
    user: SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
) -> list[int]:
    return follow_repository.list_followed_user_like_ids(db, user.id)


@router.get("/list", response_model=list[UserResponse])
async def list_users(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
) -> list[UserResponse]:
    return account_repository.list_users(db, limit=limit, offset=offset)


@router.get("/by_email", response_model=UserResponse)
async def user_by_email(
    email: str,
    _authenticated_user: SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
) -> UserResponse:
    user = account_repository.user_by_email(db, email)
    if user is None:
        raise HTTPException(404, USER_NOT_FOUND)
    return user


@router.get("/users/{public_id}", response_model=UserResponse)
async def user_by_public_id(
    public_id: UUID,
    _authenticated_user: SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
) -> UserResponse:
    user = account_repository.user_by_public_id(db, str(public_id))
    if user is None:
        raise HTTPException(404, USER_NOT_FOUND)
    return user
