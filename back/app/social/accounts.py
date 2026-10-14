"""Account registration, login and private profile routes."""

import hashlib
import logging
import sys
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from sqlalchemy.orm import Session

from app.db.runtime import binding_value
from app.schemas.auth import RegistrationResult, Token, UserProfile, UserRegistration

from app.social.repositories import accounts as account_repository
from app.social.dependencies import auth_settings, get_social_session, token_subject


router = APIRouter(prefix="/api/v1/users", tags=["MovieGraph accounts"])
logger = logging.getLogger(__name__)


async def enforce_login_rate_limit(request: Request, account_name: str) -> None:
    env = request.scope.get("env")
    if env is None:
        return

    ip_limiter = binding_value(env, "LOGIN_IP_RATE_LIMITER")
    account_limiter = binding_value(env, "LOGIN_ACCOUNT_RATE_LIMITER")
    environment = binding_value(env, "APP_ENV", "development")
    if ip_limiter is None or account_limiter is None:
        if environment in {"production", "pre"}:
            raise HTTPException(503, "Login protection is not configured")
        return

    client_ip = request.headers.get("cf-connecting-ip") or "unknown"
    normalized_account = account_name.strip().casefold()
    keys = (
        (ip_limiter, f"login-ip:{hashlib.sha256(client_ip.encode()).hexdigest()}"),
        (account_limiter, f"login-account:{hashlib.sha256(normalized_account.encode()).hexdigest()}"),
    )
    for limiter, key in keys:
        try:
            options = {"key": key}
            if sys.platform == "emscripten":
                from js import Object
                from pyodide.ffi import to_js

                options = to_js(options, dict_converter=Object.fromEntries)
            result = await limiter.limit(options)
        except Exception as error:
            logger.warning("Login rate limiter failed (%s)", type(error).__name__)
            raise HTTPException(503, "Login protection is unavailable") from None
        if not result.success:
            raise HTTPException(
                429,
                "Too many login attempts. Try again shortly.",
                headers={"Retry-After": "60"},
            )


@router.post("/", status_code=201, response_model=RegistrationResult)
async def register_account(
    account: UserRegistration,
    db: Session = Depends(get_social_session),
):
    account_repository.create_account(db, account)
    return RegistrationResult(email=account.email, username=account.username)


@router.post("/login", response_model=Token)
async def login_account(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_social_session),
) -> Token:
    from app.social.passwords import verify_password

    await enforce_login_rate_limit(request, form_data.username)
    secret, algorithm, lifetime = auth_settings(request)
    account = account_repository.get_account_by_email(db, form_data.username)
    if account is None or not verify_password(form_data.password, account.password_hash):
        raise HTTPException(401, "Invalid credentials")
    access_token = jwt.encode({
        "sub": account.email,
        "exp": datetime.now(UTC) + timedelta(minutes=lifetime),
    }, secret, algorithm=algorithm)
    return Token(access_token=access_token)


@router.get("/me", response_model=UserProfile)
async def get_my_account(
    email: str = Depends(token_subject),
    db: Session = Depends(get_social_session),
) -> UserProfile:
    profile = account_repository.get_user_profile(db, email)
    if profile is None:
        raise HTTPException(401, "Invalid credentials")
    return profile
