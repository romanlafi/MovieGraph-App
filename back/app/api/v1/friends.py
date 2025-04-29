from typing import List

from fastapi import APIRouter, Depends

from app.deps.auth import get_current_user
from app.schemas.friend import FriendRequest
from app.schemas.user import UserResponse
from app.services.friend_service import add_friend, list_friends

router = APIRouter(prefix="/friends", tags=["Friends"])

@router.post("/", response_model=UserResponse)
def make_friend(request: FriendRequest, current_user = Depends(get_current_user)):
    return add_friend(current_user["email"], str(request.email))

@router.get("/", response_model=List[UserResponse])
def get_my_friends(current_user=Depends(get_current_user)):
    return list_friends(current_user["email"])
