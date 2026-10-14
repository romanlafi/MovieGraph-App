"""Install the MovieGraph social API and its optional route groups."""

import asyncio

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.social.errors import AccountCreationError, DuplicateAccountError

from app.social import accounts, follows, movies


def install_social_api(app: FastAPI, *, include_accounts: bool = False,
                       include_follows: bool = False) -> None:
    app.state.social_db_lock = asyncio.Lock()

    @app.exception_handler(DuplicateAccountError)
    async def account_conflict(request: Request, error: DuplicateAccountError) -> JSONResponse:
        message = "Email already registered" if error.code == "email_conflict" else "Username already registered"
        return JSONResponse(status_code=409, content={
            "detail": {"error": error.code, "message": message},
        })

    @app.exception_handler(AccountCreationError)
    async def account_creation_failed(request: Request, error: AccountCreationError) -> JSONResponse:
        return JSONResponse(status_code=503, content={"detail": "Account could not be created"})

    app.include_router(movies.router)
    if include_accounts:
        app.include_router(accounts.router)
    if include_follows:
        app.include_router(follows.router)
