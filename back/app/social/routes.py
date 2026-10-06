"""Limited Worker API using existing Bearer JWTs and TMDB social identity."""

import asyncio
from collections.abc import AsyncIterator
from importlib import import_module
import os

from fastapi import APIRouter, Depends, HTTPException, Path, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from . import store


root_package = __package__.rpartition(".")[0]
prefix = f"{root_package}." if root_package else ""
database = import_module(f"{prefix}db.database")
runtime = import_module(f"{prefix}db.runtime")
schemas = import_module(f"{prefix}schemas.comment")

router = APIRouter(prefix="/api/v1/movies", tags=["MovieGraph social"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/users/login")


async def token_subject(request: Request, token: str = Depends(oauth2_scheme)) -> str:
    env = request.scope.get("env")
    secret = runtime.binding_value(env, "SECRET_KEY", "") if env is not None else os.getenv("SECRET_KEY", "")
    algorithm = runtime.binding_value(env, "JWT_ALGORITHM", "HS256") if env is not None else os.getenv("JWT_ALGORITHM", "HS256")
    if not isinstance(secret, str) or not secret.strip() or not isinstance(algorithm, str) or not algorithm.strip():
        raise HTTPException(503, "Authentication is not configured")
    try:
        payload = jwt.decode(token, secret, algorithms=[algorithm], options={
            "require_exp": True, "require_sub": True,
        })
        email = payload["sub"]
        if not isinstance(email, str) or not email:
            raise JWTError
        return email
    except JWTError:
        raise HTTPException(401, "Invalid credentials") from None


async def get_social_session(request: Request) -> AsyncIterator[Session]:
    try:
        async with request.app.state.social_db_lock:
            with database.session_scope(runtime.request_database_config(request)) as session:
                yield session
    except (runtime.DatabaseConfigurationError, SQLAlchemyError):
        raise HTTPException(503, "Database unavailable or not configured") from None


async def get_authenticated_user(
    email: str = Depends(token_subject),
    db: Session = Depends(get_social_session),
) -> store.SocialUser:
    user = store.get_user_by_email(db, email)
    if user is None:
        raise HTTPException(401, "Invalid credentials")
    return user


@router.get("/{tmdb_movie_id}/comments", response_model=list[schemas.CommentResponse])
async def list_comments(
    tmdb_movie_id: int = Path(gt=0),
    db: Session = Depends(get_social_session),
):
    return store.list_movie_comments(db, tmdb_movie_id)


@router.post("/{tmdb_movie_id}/comments", response_model=schemas.CommentResponse)
async def post_comment(
    comment: schemas.CommentCreate,
    tmdb_movie_id: int = Path(gt=0),
    user: store.SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
):
    return store.create_comment(db, user, tmdb_movie_id, comment.text)


@router.get("/likes", response_model=list[int])
async def my_likes(
    user: store.SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
):
    return store.list_user_likes(db, user.id)


@router.get("/{tmdb_movie_id}/like")
async def like_state(
    tmdb_movie_id: int = Path(gt=0),
    user: store.SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
):
    return {"tmdb_movie_id": tmdb_movie_id, "liked": store.is_movie_liked(db, user.id, tmdb_movie_id)}


@router.post("/{tmdb_movie_id}/like")
async def like_movie(
    tmdb_movie_id: int = Path(gt=0),
    user: store.SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
):
    store.like_movie(db, user.id, tmdb_movie_id)
    return {"detail": "Movie liked"}


@router.delete("/{tmdb_movie_id}/like")
async def unlike_movie(
    tmdb_movie_id: int = Path(gt=0),
    user: store.SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
):
    store.unlike_movie(db, user.id, tmdb_movie_id)
    return {"detail": "Movie unliked"}


def install_social_api(app) -> None:
    app.state.social_db_lock = asyncio.Lock()
    app.include_router(router)
