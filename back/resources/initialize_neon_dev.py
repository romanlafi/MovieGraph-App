"""Initialize and verify the MovieGraph Neon development database."""

import getpass
import json
import os
from contextlib import contextmanager
from urllib.parse import parse_qs, urlsplit

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool

from resources.social_migration_audit import inspect_database


@contextmanager
def temporary_environment(values: dict[str, str]):
    previous = {name: os.environ.get(name) for name in values}
    os.environ.update(values)
    try:
        yield
    finally:
        for name, value in previous.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value


def request_development_url() -> str:
    confirmation = input("Neon target must be MovieGraph > PRE (formerly dev) > moviegraph. Type DEV to continue: ")
    if confirmation != "DEV":
        raise RuntimeError("Target confirmation failed; no database connection was made")

    database_url = getpass.getpass("Paste the direct Neon PRE URL (input hidden): ").strip()
    parsed = make_url(database_url)
    url_parts = urlsplit(database_url)
    ssl_modes = parse_qs(url_parts.query).get("sslmode", [])
    if parsed.get_backend_name() != "postgresql":
        raise RuntimeError("The URL must use PostgreSQL")
    if not parsed.host or ".neon.tech" not in parsed.host:
        raise RuntimeError("The URL must point to a Neon endpoint")
    if "-pooler." in parsed.host:
        raise RuntimeError("Use the direct, unpooled Neon URL")
    if parsed.database != "moviegraph":
        raise RuntimeError("The URL must select the moviegraph database")
    if not ssl_modes or ssl_modes[0] not in {"require", "verify-ca", "verify-full"}:
        raise RuntimeError("The URL must include sslmode=require or stronger")
    return database_url


def main() -> None:
    print("This applies the fresh MovieGraph social schema to DEV only.")
    print("Do not use a URL copied from the production branch. The URL is not saved.")
    database_url = request_development_url()
    environment = {
        "ALEMBIC_DATABASE_URL": database_url,
        "ALEMBIC_TARGET": "neon-development",
        "ALEMBIC_ALLOW_DATA_MIGRATION": "1",
        "SOCIAL_AUDIT_DATABASE_URL": database_url,
        "SOCIAL_AUDIT_TARGET": "neon-development",
    }
    alembic_config = Config("alembic.ini")

    with temporary_environment(environment):
        command.upgrade(alembic_config, "head")
        command.current(alembic_config)
        engine = create_engine(database_url, poolclass=NullPool, hide_parameters=True)
        try:
            with engine.connect() as connection:
                print(json.dumps({
                    "target": "neon-development",
                    "database": connection.exec_driver_sql("SELECT current_database()").scalar_one(),
                    "inventory": inspect_database(connection),
                }, default=str, indent=2))
        finally:
            engine.dispose()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Migration stopped safely ({type(error).__name__}). No URL or database credentials were printed.")
        raise SystemExit(1) from None
