from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.deps.auth import get_current_user
from app.schemas.user import UserCreate, UserResponse, UserLogin, Token
from app.services.user_service import register_user, authenticate_user, format_user_node

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=UserResponse)
def register(user: UserCreate):
    return register_user(user)

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    return authenticate_user(
        UserLogin(
            email=form_data.username,
            password=form_data.password
        )
    )

@router.get("/me", response_model=UserResponse)
def get_my_profile(current_user=Depends(get_current_user)):
    return format_user_node(current_user)