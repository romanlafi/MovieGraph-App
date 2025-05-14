from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.deps.auth import get_current_user
from app.schemas.friend import FriendRequest, FriendResponse
from app.schemas.user import UserResponse
from app.services.postgres.friend_service import (
    add_friend,
    get_friends,
    list_all_users,
    get_user_detail_by_email, search_users_by_username_or_email
)

router = APIRouter(prefix="/friends", tags=["Friends"])

@router.get("/search", response_model=List[UserResponse])
def search_users(
    query: str = Query(..., min_length=2),
    db: Session = Depends(get_db)
):
    return search_users_by_username_or_email(db, query)

@router.post("/")
def make_friend(
        request: FriendRequest,
        current_user = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    return add_friend(db, current_user.email, str(request.email))

@router.get("/", response_model=List[FriendResponse])
def get_my_friends(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return get_friends(db, current_user.email)

@router.get("/list", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return list_all_users(db)

@router.get("/by_email", response_model=UserResponse)
def get_user_by_email(email: str = Query(...), db: Session = Depends(get_db)):
    return get_user_detail_by_email(db, email)
