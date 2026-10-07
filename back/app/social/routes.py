"""Limited Worker API using existing Bearer JWTs and TMDB social identity."""

import asyncio
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from importlib import import_module
import os

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from . import store


root_package = __package__.rpartition(".")[0]
prefix = f"{root_package}." if root_package else ""
database = import_module(f"{prefix}db.database")
runtime = import_module(f"{prefix}db.runtime")
schemas = import_module(f"{prefix}schemas.comment")
auth_schemas = import_module(f"{prefix}schemas.auth")

router = APIRouter(prefix="/api/v1/movies", tags=["MovieGraph social"])
account_router = APIRouter(prefix="/api/v1/users", tags=["MovieGraph accounts"])
follows_router = APIRouter(prefix="/api/v1/follows", tags=["MovieGraph follows"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/users/login")


def auth_settings(request: Request) -> tuple[str, str, int]:
    env = request.scope.get("env")
    secret = runtime.binding_value(env, "SECRET_KEY", "") if env is not None else os.getenv("SECRET_KEY", "")
    algorithm = runtime.binding_value(env, "JWT_ALGORITHM", "HS256") if env is not None else os.getenv("JWT_ALGORITHM", "HS256")
    lifetime = runtime.binding_value(env, "ACCESS_TOKEN_EXPIRE_MINUTES", 30) if env is not None else os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    try:
        lifetime = int(lifetime)
    except (TypeError, ValueError):
        lifetime = 0
    if not isinstance(secret, str) or not secret.strip() or not isinstance(algorithm, str) or not algorithm.strip() or lifetime <= 0:
        raise HTTPException(503, "Authentication is not configured")
    return secret, algorithm, lifetime


async def token_subject(request: Request, token: str = Depends(oauth2_scheme)) -> str:
    secret, algorithm, _ = auth_settings(request)
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


@account_router.post("/", status_code=201)
async def register_account(
    account: auth_schemas.UserRegistration,
    db: Session = Depends(get_social_session),
):
    email = str(account.email)
    conflict = store.account_conflict(db, email, account.username)
    if conflict == "email_conflict":
        raise HTTPException(409, {"error": conflict, "message": "Email already registered"})
    if conflict == "user_conflict":
        raise HTTPException(409, {"error": conflict, "message": "Username already registered"})
    try:
        store.create_account(db, {
            "email": email,
            "username": account.username,
            "password": account.password,
            "birthdate": account.birthdate,
            "bio": account.bio,
            "favorite_genres": account.favorite_genres,
        })
    except IntegrityError:
        db.rollback()
        conflict = store.account_conflict(db, email, account.username)
        if conflict == "email_conflict":
            raise HTTPException(409, {"error": conflict, "message": "Email already registered"}) from None
        if conflict == "user_conflict":
            raise HTTPException(409, {"error": conflict, "message": "Username already registered"}) from None
        raise HTTPException(503, "Account could not be created") from None
    except (runtime.DatabaseConfigurationError, SQLAlchemyError):
        db.rollback()
        raise HTTPException(503, "Account could not be created") from None
    return {"email": email, "username": account.username}


@account_router.post("/login", response_model=auth_schemas.Token)
async def login_account(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_social_session),
):
    from .passwords import verify_password

    secret, algorithm, lifetime = auth_settings(request)
    account = store.get_account_by_email(db, form_data.username)
    if account is None or not verify_password(form_data.password, account["password"]):
        raise HTTPException(401, "Invalid credentials")
    access_token = jwt.encode({
        "sub": account["email"],
        "exp": datetime.now(UTC) + timedelta(minutes=lifetime),
    }, secret, algorithm=algorithm)
    return {"access_token": access_token, "token_type": "bearer"}


@account_router.get("/me", response_model=auth_schemas.UserProfile)
async def get_my_account(
    email: str = Depends(token_subject),
    db: Session = Depends(get_social_session),
):
    profile = store.get_user_profile(db, email)
    if profile is None:
        raise HTTPException(401, "Invalid credentials")
    return profile


@follows_router.get("/search", response_model=list[auth_schemas.UserResponse])
async def search_users(
    query: str = Query(..., min_length=2),
    user: store.SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
):
    return store.search_users(db, query, user.email)


@follows_router.post("/")
async def follow_user(
    follow: auth_schemas.FollowRequest,
    user: store.SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
):
    result = store.follow_user(db, user.id, str(follow.email))
    if result is None:
        raise HTTPException(404, "User not found")


@follows_router.delete("/")
async def unfollow_user(
    follow: auth_schemas.FollowRequest,
    user: store.SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
):
    result = store.unfollow_user(db, user.id, str(follow.email))
    if result is None:
        raise HTTPException(404, "User not found")


@follows_router.get("/following", response_model=list[auth_schemas.UserResponse])
async def get_my_following(
    user: store.SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
):
    return store.list_following(db, user.id)


@follows_router.get("/followers", response_model=list[auth_schemas.UserResponse])
async def get_my_followers(
    user: store.SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
):
    return store.list_followers(db, user.id)


@follows_router.get("/movie-likes", response_model=list[int])
async def get_followed_movie_likes(
    user: store.SocialUser = Depends(get_authenticated_user),
    db: Session = Depends(get_social_session),
):
    return store.list_followed_user_like_ids(db, user.id)


@follows_router.get("/list", response_model=list[auth_schemas.UserResponse])
async def list_users(db: Session = Depends(get_social_session)):
    return store.list_users(db)


@follows_router.get("/by_email", response_model=auth_schemas.UserResponse)
async def user_by_email(email: str, db: Session = Depends(get_social_session)):
    user = store.user_by_email(db, email)
    if user is None:
        raise HTTPException(404, "User not found")
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


def install_social_api(app, *, include_accounts: bool = False, include_follows: bool = False) -> None:
    app.state.social_db_lock = asyncio.Lock()
    app.include_router(router)
    if include_accounts:
        app.include_router(account_router)
    if include_follows:
        app.include_router(follows_router)
