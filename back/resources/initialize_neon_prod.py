"""Apply reviewed Alembic migrations to the verified empty Neon PROD branch."""

import getpass
import json
import os
from contextlib import contextmanager
from urllib.parse import parse_qs, urlsplit

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.pool import NullPool


PRODUCTION_NEON_HOST = "ep-dawn-boat-b23e2xzc.c-6.eu-central-1.aws.neon.tech"
CONFIRMATION = "APPLY MOVIEGRAPH PRODUCTION MIGRATIONS"


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


def request_production_url() -> str:
    print("Target: MovieGraph > production > moviegraph (verified Hyperdrive PROD origin).")
    print("The read-only inventory found no application tables or rows in PROD.")
    if input(f"Type exactly {CONFIRMATION}: ") != CONFIRMATION:
        raise RuntimeError("Production confirmation did not match; no migration was run")

    database_url = os.environ.get("ALEMBIC_DATABASE_URL", "").strip()
    if not database_url:
        database_url = getpass.getpass("Paste the direct Neon production URL (input hidden): ").strip()
    parsed = urlsplit(database_url)
    ssl_modes = parse_qs(parsed.query).get("sslmode", [])
    if (parsed.scheme not in {"postgresql", "postgresql+psycopg2", "postgresql+pg8000"}
            or parsed.hostname != PRODUCTION_NEON_HOST
            or parsed.path != "/moviegraph"
            or "-pooler." in (parsed.hostname or "")
            or not ssl_modes or ssl_modes[0] not in {"require", "verify-ca", "verify-full"}):
        raise RuntimeError("URL does not match the verified direct Neon PROD endpoint, database and TLS settings")
    return database_url


def inspect_empty_production(database_url: str) -> dict:
    engine = create_engine(database_url, poolclass=NullPool, hide_parameters=True)
    try:
        with engine.connect() as connection:
            connection.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
            connection.execute(text("SET LOCAL statement_timeout = '10s'"))
            database = connection.execute(text("SELECT current_database()")).scalar_one()
            schemas = connection.execute(text(
                "SELECT schema_name FROM information_schema.schemata "
                "WHERE schema_name NOT IN ('pg_catalog', 'information_schema') "
                "ORDER BY schema_name"
            )).scalars().all()
            inspector = inspect(connection)
            tables = {
                schema: inspector.get_table_names(schema=schema)
                for schema in schemas
            }
            unexpected = {schema: names for schema, names in tables.items() if names}
            if database != "moviegraph" or unexpected:
                raise RuntimeError("Production schema changed after inventory; no migration was run")
            return {"database": database, "schemas": schemas, "application_tables_before": tables}
    finally:
        engine.dispose()


def main() -> None:
    database_url = request_production_url()
    environment = {
        "ALEMBIC_DATABASE_URL": database_url,
        "ALEMBIC_TARGET": "neon-production",
        "ALEMBIC_ALLOW_DATA_MIGRATION": "1",
        "ALEMBIC_ALLOW_PRODUCTION_MIGRATION": "1",
        "ALEMBIC_EXPECTED_PRODUCTION_NEON_HOST": PRODUCTION_NEON_HOST,
    }

    with temporary_environment(environment):
        before = inspect_empty_production(database_url)
        config = Config("alembic.ini")
        command.upgrade(config, "head")
        command.current(config)

        engine = create_engine(database_url, poolclass=NullPool, hide_parameters=True)
        try:
            with engine.connect() as connection:
                inspector = inspect(connection)
                tables = inspector.get_table_names(schema="public")
                counts = {
                    table: connection.execute(text(
                        f'SELECT count(*) FROM public."{table}"'
                    )).scalar_one()
                    for table in tables if table != "alembic_version"
                }
                revision = connection.execute(text(
                    "SELECT version_num FROM public.alembic_version"
                )).scalar_one()
                pgcrypto = connection.execute(text(
                    "SELECT to_regprocedure('public.crypt(text,text)') IS NOT NULL "
                    "AND to_regprocedure('public.gen_salt(text,integer)') IS NOT NULL"
                )).scalar_one()
                if revision != "20261016_00" or not pgcrypto or any(counts.values()):
                    raise RuntimeError("Production migration verification failed")
                print(json.dumps({
                    "target": "neon-production",
                    "before": before,
                    "revision": revision,
                    "pgcrypto_available": pgcrypto,
                    "table_row_counts": counts,
                }, indent=2))
        finally:
            engine.dispose()


if __name__ == "__main__":
    main()
