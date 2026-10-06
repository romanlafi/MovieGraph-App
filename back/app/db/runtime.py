"""Request-time database configuration independent of legacy auth/config."""

from dataclasses import dataclass, field
import os

from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import ArgumentError


class DatabaseConfigurationError(ValueError):
    """Safe failure: messages never contain connection values."""


def binding_value(env, name: str, default=None):
    return env.get(name, default) if isinstance(env, dict) else getattr(env, name, default)


@dataclass(frozen=True)
class DatabaseConfig:
    url: URL = field(repr=False)
    worker: bool = False

    @classmethod
    def local(cls, connection_string: str | None = None) -> "DatabaseConfig":
        raw = connection_string if connection_string is not None else os.getenv("DATABASE_URL", "")
        if not raw.strip():
            raise DatabaseConfigurationError("Missing required backend configuration: DATABASE_URL")
        try:
            url = make_url(raw.strip())
            if url.drivername == "postgres":
                url = url.set(drivername="postgresql")
            if url.drivername not in {"postgresql", "postgresql+psycopg2", "postgresql+pg8000"}:
                raise ValueError
            if not url.host or not url.database or not url.username:
                raise ValueError
            return cls(url)
        except (ValueError, TypeError, ArgumentError):
            raise DatabaseConfigurationError("DATABASE_URL must be a PostgreSQL connection URL") from None

    @classmethod
    def hyperdrive(cls, env) -> "DatabaseConfig":
        hd = binding_value(env, "HYPERDRIVE")
        if hd is None:
            raise DatabaseConfigurationError("Missing Worker binding: HYPERDRIVE")
        try:
            values = {key: binding_value(hd, key) for key in ("host", "port", "user", "password", "database")}
            if any(not isinstance(values[key], str) or not values[key] for key in ("host", "user", "password", "database")):
                raise ValueError
            port = int(values["port"])
            if not 1 <= port <= 65535:
                raise ValueError
            return cls(URL.create(
                "postgresql+pg8000", username=values["user"], password=values["password"],
                host=values["host"], port=port, database=values["database"],
            ), worker=True)
        except (ValueError, TypeError):
            raise DatabaseConfigurationError("Invalid Worker HYPERDRIVE binding") from None


def request_database_config(request) -> DatabaseConfig:
    # Worker scope is authoritative: never fall back to local credentials.
    if "env" in request.scope:
        return DatabaseConfig.hyperdrive(request.scope["env"])
    return DatabaseConfig.local()
