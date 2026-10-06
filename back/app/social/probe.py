"""Isolated DEV fixture administration; never installed in application Workers."""

from importlib import import_module
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import event, func, inspect, MetaData, select, Table, text
from sqlalchemy.exc import SQLAlchemyError

from .routes import database, prefix, runtime


require_probe_access = import_module(f"{prefix}db.diagnostics").require_probe_access
router = APIRouter(prefix="/api/internal", include_in_schema=False)


class FixtureCreate(BaseModel):
    fixture_id: UUID
    password_hash: str = Field(pattern=r"^\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}$")


def fixture_identity(fixture_id: UUID) -> tuple[str, str]:
    username = f"social-probe-{fixture_id.hex}"
    return f"{username}@example.invalid", username


def inventory(session) -> dict[str, int]:
    connection = session.connection()
    return {
        name: session.scalar(select(func.count()).select_from(Table(name, MetaData())))
        for name in sorted(inspect(connection).get_table_names())
    }


def prepare_fixture(config, fixture: FixtureCreate) -> dict:
    email, username = fixture_identity(fixture.fixture_id)
    rolled_back_email = f"rollback-{email}"
    opened = closed = 0

    def connected(*args):
        nonlocal opened
        opened += 1

    def disconnected(*args):
        nonlocal closed
        closed += 1

    with database.engine_scope(config) as engine:
        event.listen(engine, "connect", connected)
        event.listen(engine, "close", disconnected)
        with database.session_context(engine) as session:
            baseline = inventory(session)
            if not {"users", "comments", "user_movie_likes", "alembic_version"}.issubset(baseline):
                raise ValueError("Expected migrated development schema")
            if session.scalar(text("SELECT version_num FROM alembic_version")) != "20261006_01":
                raise ValueError("Expected development migration revision")
            if session.scalar(text("SELECT 1")) != 1:
                raise ValueError("SELECT verification failed")
            user_id = session.scalar(text("""
                INSERT INTO users (email, username, password)
                VALUES (:email, :username, :password) RETURNING id
            """), {"email": email, "username": username, "password": fixture.password_hash})
            session.commit()
        with database.session_context(engine) as session:
            if session.scalar(text("SELECT email FROM users WHERE id=:id"), {"id": user_id}) != email:
                raise ValueError("INSERT verification failed")
            session.execute(text("UPDATE users SET bio='runtime-probe-updated' WHERE id=:id"), {"id": user_id})
            session.commit()
        with database.session_context(engine) as session:
            if session.scalar(text("SELECT bio FROM users WHERE id=:id"), {"id": user_id}) != "runtime-probe-updated":
                raise ValueError("UPDATE verification failed")

        class DeliberateRollback(Exception):
            pass

        try:
            with database.session_context(engine) as session:
                session.execute(text("UPDATE users SET bio='must-roll-back' WHERE id=:id"), {"id": user_id})
                session.execute(text("""
                    INSERT INTO users (email, username, password)
                    VALUES (:email, :username, :password)
                """), {"email": rolled_back_email, "username": f"rollback-{username}", "password": fixture.password_hash})
                raise DeliberateRollback()
        except DeliberateRollback:
            pass
        with database.session_context(engine) as session:
            if session.scalar(text("SELECT bio FROM users WHERE id=:id"), {"id": user_id}) != "runtime-probe-updated":
                raise ValueError("UPDATE rollback verification failed")
            if session.scalar(text("SELECT count(*) FROM users WHERE email=:email"), {"email": rolled_back_email}) != 0:
                raise ValueError("INSERT rollback verification failed")
    if opened == 0 or opened != closed:
        raise ValueError("Session cleanup verification failed")
    return {
        "user_id": user_id, "email": email, "username": username,
        "baseline": baseline,
        "runtime": {name: "PASS" for name in ("select", "insert", "update", "rollback", "session_cleanup")},
    }


def remove_fixture(config, fixture_id: UUID) -> dict:
    email, username = fixture_identity(fixture_id)
    with database.session_scope(config) as session:
        for fixture_email, fixture_username in ((email, username), (f"rollback-{email}", f"rollback-{username}")):
            user_id = session.scalar(text("SELECT id FROM users WHERE email=:email AND username=:username"),
                                     {"email": fixture_email, "username": fixture_username})
            if user_id is not None:
                session.execute(text("DELETE FROM comments WHERE user_id=:id"), {"id": user_id})
                session.execute(text("DELETE FROM user_movie_likes WHERE user_id=:id"), {"id": user_id})
                session.execute(text("DELETE FROM users WHERE id=:id AND email=:email AND username=:username"),
                                {"id": user_id, "email": fixture_email, "username": fixture_username})
        session.commit()
        remaining = session.scalar(text("SELECT count(*) FROM users WHERE email IN (:email, :rolled_back_email)"),
                                   {"email": email, "rolled_back_email": f"rollback-{email}"})
        if remaining != 0:
            raise ValueError("DELETE verification failed")
        return {"delete": "PASS", "after": inventory(session)}


@router.post("/social-fixture")
async def create_fixture(request: Request, fixture: FixtureCreate):
    require_probe_access(request)
    try:
        async with request.app.state.social_db_lock:
            return prepare_fixture(runtime.request_database_config(request), fixture)
    except (runtime.DatabaseConfigurationError, SQLAlchemyError, ValueError):
        raise HTTPException(503, "Development fixture preparation failed") from None


@router.delete("/social-fixture/{fixture_id}")
async def delete_fixture(request: Request, fixture_id: UUID):
    require_probe_access(request)
    try:
        async with request.app.state.social_db_lock:
            return remove_fixture(runtime.request_database_config(request), fixture_id)
    except (runtime.DatabaseConfigurationError, SQLAlchemyError, ValueError):
        raise HTTPException(503, "Development fixture cleanup failed") from None


def install_social_probe(app) -> None:
    app.include_router(router)
