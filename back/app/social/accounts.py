"""Account registration, login and private profile routes."""

import hashlib
import os
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from sqlalchemy.orm import Session

from app.db.runtime import binding_value
from app.core.rate_limits import check_limit
from app.schemas.auth import RegistrationResult, Token, UserProfile, UserRegistration

from app.social.repositories import accounts as account_repository
from app.social.dependencies import auth_settings, get_social_session, run_social_operation, token_subject
from app.social.errors import DuplicateAccountError


router = APIRouter(prefix="/api/v1/users", tags=["MovieGraph accounts"])
INVALID_CREDENTIALS = "Invalid credentials"


def use_database_passwords(request: Request) -> bool:
    env = request.scope.get("env")
    backend = (os.getenv("PASSWORD_HASH_BACKEND", "python") if env is None
               else binding_value(env, "PASSWORD_HASH_BACKEND", "python"))
    if backend not in {"python", "postgres"}:
        raise HTTPException(503, "Password hashing is not configured")
    return backend == "postgres"


async def enforce_login_rate_limit(request: Request, account_name: str) -> None:
    env = request.scope.get("env")
    if env is None:
        return

    client_ip = request.headers.get("cf-connecting-ip") or "unknown"
    normalized_account = account_name.strip().casefold()
    keys = (
        ("LOGIN_IP_RATE_LIMITER", f"login-ip:{hashlib.sha256(client_ip.encode()).hexdigest()}"),
        ("LOGIN_ACCOUNT_RATE_LIMITER", f"login-account:{hashlib.sha256(normalized_account.encode()).hexdigest()}"),
    )
    for name, key in keys:
        await check_limit(env, name, key)


@router.post("/", status_code=201, response_model=RegistrationResult,
             responses={503: {"description": "Account registration is temporarily unavailable"}})
async def register_account(
    request: Request,
    account: UserRegistration,
):
    from app.social.passwords import hash_password, hash_password_in_database

    auth_settings(request)
    conflict = await run_social_operation(request, lambda db: account_repository.account_conflict(
        db, str(account.email), account.username,
    ))
    if conflict is not None:
        raise DuplicateAccountError(conflict)
    if use_database_passwords(request):
        password_hash = await run_social_operation(request, lambda db: hash_password_in_database(db, account.password))
    else:
        password_hash = hash_password(account.password)
    await run_social_operation(request, lambda db: account_repository.create_account(db, account, password_hash))
    return RegistrationResult(email=account.email, username=account.username)


@router.post("/login", responses={
    401: {"description": "Invalid credentials"},
    429: {"description": "Too many login attempts"},
    503: {"description": "Login protection is unavailable"},
})
async def login_account(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Token:
    from app.social.passwords import verify_password, verify_password_in_database

    await enforce_login_rate_limit(request, form_data.username)
    secret, algorithm, lifetime = auth_settings(request)
    account = await run_social_operation(request, lambda db: account_repository.get_account_by_email(
        db, form_data.username,
    ))
    if account is None:
        raise HTTPException(401, INVALID_CREDENTIALS)
    if use_database_passwords(request):
        valid_password = await run_social_operation(request, lambda db: verify_password_in_database(
            db, form_data.password, account.password_hash,
        ))
    else:
        valid_password = verify_password(form_data.password, account.password_hash)
    if not valid_password:
        raise HTTPException(401, INVALID_CREDENTIALS)
    access_token = jwt.encode({
        "sub": account.email,
        "exp": datetime.now(UTC) + timedelta(minutes=lifetime),
    }, secret, algorithm=algorithm)
    return Token(access_token=access_token)


@router.get("/me", responses={401: {"description": "Invalid credentials"}})
async def get_my_account(
    email: str = Depends(token_subject),
    db: Session = Depends(get_social_session),
) -> UserProfile:
    profile = account_repository.get_user_profile(db, email)
    if profile is None:
        raise HTTPException(401, INVALID_CREDENTIALS)
    return profile
