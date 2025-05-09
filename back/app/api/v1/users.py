from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.deps.auth import get_current_user
from app.exceptions import UserConflictError, InvalidCredentialsError, EmailConflictError
from app.models.user import User
from app.schemas.user import UserCreate, Token
from app.services.postgres.auth_service import authenticate_user, create_access_token
from app.services.postgres.user_service import create_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/")
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise EmailConflictError()

    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise UserConflictError()

    user = create_user(db, user_data)
    return {"email": user.email, "username": user.username}

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise InvalidCredentialsError()

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "username": current_user.username,
        "birthdate": current_user.birthdate,
        "bio": current_user.bio,
        "favorite_genres": current_user.favorite_genres
    }