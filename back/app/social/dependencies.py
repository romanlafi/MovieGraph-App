"""Shared authentication and request-scoped database dependencies."""

import asyncio
import os
import sys
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from time import monotonic
from typing import TypeVar

from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db import database, runtime

from app.social.contracts import SocialUser
from app.social.repositories import accounts as account_repository


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/users/login")
OperationResult = TypeVar("OperationResult")
SESSION_LOCK_TIMEOUT_SECONDS = 5


def auth_settings(request: Request) -> tuple[str, str, int]:
    env = request.scope.get("env")
    if env is None:
        secret = os.getenv("SECRET_KEY", "")
        algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        lifetime = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    else:
        secret = runtime.binding_value(env, "SECRET_KEY", "")
        algorithm = runtime.binding_value(env, "JWT_ALGORITHM", "HS256")
        lifetime = runtime.binding_value(env, "ACCESS_TOKEN_EXPIRE_MINUTES", 30)
    try:
        lifetime = int(lifetime)
    except (TypeError, ValueError):
        lifetime = 0
    if (
        not isinstance(secret, str)
        or not secret.strip()
        or not isinstance(algorithm, str)
        or not algorithm.strip()
        or lifetime <= 0
    ):
        raise HTTPException(503, "Authentication is not configured")
    return secret, algorithm, lifetime


def token_subject(request: Request, token: str = Depends(oauth2_scheme)) -> str:
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


@asynccontextmanager
async def social_session(request: Request) -> AsyncIterator[Session]:
    """Serialize sockets using waiters owned by this invocation."""
    session_lock = request.app.state.social_db_lock
    deadline = monotonic() + SESSION_LOCK_TIMEOUT_SECONDS
    while session_lock.locked():
        remaining = deadline - monotonic()
        if remaining <= 0:
            raise HTTPException(503, "Database is busy. Try again shortly.", headers={"Retry-After": "1"})
        delay = min(0.1, remaining)
        if sys.platform == "emscripten":
            from js import scheduler

            await scheduler.wait(delay * 1000)
        else:
            await asyncio.sleep(delay)
    await session_lock.acquire()
    try:
        with database.session_scope(runtime.request_database_config(request)) as session:
            yield session
    except (runtime.DatabaseConfigurationError, SQLAlchemyError):
        raise HTTPException(503, "Database unavailable or not configured") from None
    finally:
        session_lock.release()


async def get_social_session(request: Request) -> AsyncIterator[Session]:
    async with social_session(request) as session:
        yield session


async def run_social_operation(request: Request, operation: Callable[[Session], OperationResult]) -> OperationResult:
    async with social_session(request) as session:
        return operation(session)


async def get_authenticated_user(
    email: str = Depends(token_subject),
    db: Session = Depends(get_social_session),
) -> SocialUser:
    user = account_repository.get_user_by_email(db, email)
    if user is None:
        raise HTTPException(401, "Invalid credentials")
    return user
