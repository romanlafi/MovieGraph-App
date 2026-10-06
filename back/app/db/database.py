"""Lazy engines and request-scoped sync sessions. No import-time engine."""

from contextlib import contextmanager
from collections.abc import Iterator

from fastapi import HTTPException, Request
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, Session
from sqlalchemy.pool import NullPool

from .runtime import DatabaseConfig, DatabaseConfigurationError, request_database_config


Base = declarative_base()


def create_database_engine(config: DatabaseConfig) -> Engine:
    options = {"poolclass": NullPool, "hide_parameters": True}
    if config.worker:
        # Hyperdrive handles origin TLS; its Worker-side socket is not Neon TLS.
        options["connect_args"] = {"ssl_context": False, "timeout": 10}
    return create_engine(config.url, **options)


@contextmanager
def engine_scope(config: DatabaseConfig) -> Iterator[Engine]:
    engine = create_database_engine(config)
    try:
        yield engine
    finally:
        engine.dispose()


@contextmanager
def session_context(engine: Engine) -> Iterator[Session]:
    session = Session(bind=engine, autoflush=False)
    try:
        yield session
    except BaseException:
        session.rollback()
        raise
    finally:
        session.close()


@contextmanager
def session_scope(config: DatabaseConfig) -> Iterator[Session]:
    with engine_scope(config) as engine, session_context(engine) as session:
        yield session


def get_db(request: Request) -> Iterator[Session]:
    # Legacy local dependency. Worker diagnostics serialize all synchronous
    # session work inside async routes; legacy routes remain disabled there.
    try:
        config = request_database_config(request)
    except DatabaseConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from None
    with session_scope(config) as session:
        yield session
