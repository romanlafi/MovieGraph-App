"""Only installed by db_probe_worker.py; absent from the normal Worker."""

import asyncio
from hmac import compare_digest

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from .database import session_scope
from .probe import ProbeVerificationError, run_probe
from .runtime import binding_value, DatabaseConfigurationError, request_database_config


router = APIRouter(prefix="/api/internal", include_in_schema=False)


def require_probe_access(request: Request) -> None:
    env = request.scope.get("env", {})
    if (binding_value(env, "APP_ENV") != "development"
            or binding_value(env, "DB_PROBE_ENABLED") != "true"
            or binding_value(env, "DB_PROBE_DEVELOPMENT_DATABASE") != "true"):
        raise HTTPException(404, "Not Found")
    secret = binding_value(env, "DB_PROBE_TOKEN", "")
    if not secret or not compare_digest(request.headers.get("Authorization", "").encode("utf-8"), f"Bearer {secret}".encode("utf-8")):
        raise HTTPException(401, "Diagnostic authorization required")


@router.get("/db-health")
async def db_health(request: Request):
    require_probe_access(request)
    try:
        async with request.app.state.db_lock:
            with session_scope(request_database_config(request)) as session:
                if session.execute(text("SELECT 1")).scalar_one() != 1:
                    raise HTTPException(503, "Database verification failed")
        return {"database": "ok"}
    except (DatabaseConfigurationError, SQLAlchemyError):
        raise HTTPException(503, "Database unavailable or not configured") from None


@router.post("/db-probe")
async def db_probe(request: Request):
    require_probe_access(request)
    try:
        async with request.app.state.db_lock:
            return run_probe(request_database_config(request))
    except (DatabaseConfigurationError, SQLAlchemyError, ProbeVerificationError):
        raise HTTPException(503, "Database probe failed; verify development binding and probe setup") from None


def install_diagnostics(app) -> None:
    # Isolate lock holds no environment/credentials. Serialize transactions and
    # cleanup together, as required by synchronous Python Worker socket support.
    app.state.db_lock = asyncio.Lock()
    app.include_router(router)
