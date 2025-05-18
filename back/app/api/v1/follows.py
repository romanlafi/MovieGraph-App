from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.deps.auth import get_current_user
from app.schemas.follow import FollowRequest
from app.schemas.user import UserResponse
from app.services.postgres.follow_service import (
    list_all_users,
    search_users_by_username_or_email,
    follow_user,
    unfollow_user,
    get_following,
    get_followers,
    get_user_response_by_email
)

router = APIRouter(prefix="/follows", tags=["Follows"])

@router.get("/search", response_model=List[UserResponse])
def search_users(
    query: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return search_users_by_username_or_email(db, query, current_user.email)

@router.post("/")
def follow(
    request: FollowRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return follow_user(db, current_user.email, request.email)

@router.delete("/")
def unfollow(
    request: FollowRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return unfollow_user(db, current_user.email, request.email)

@router.get("/following", response_model=List[UserResponse])
def get_my_following(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_following(db, current_user.email)

@router.get("/followers", response_model=List[UserResponse])
def get_my_followers(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_followers(db, current_user.email)

@router.get("/list", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return list_all_users(db)

@router.get("/by_email", response_model=UserResponse)
def get_user_by_email(email: str = Query(...), db: Session = Depends(get_db)):
    return get_user_response_by_email(db, email)