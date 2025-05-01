from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.deps.auth import get_current_user
from app.schemas.friend import FriendRequest, FriendResponse
from app.services.postgres.friend_service import add_friend, get_friends


router = APIRouter(prefix="/friends", tags=["Friends"])

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
