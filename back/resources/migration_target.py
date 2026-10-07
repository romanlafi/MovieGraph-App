import os
from urllib.parse import parse_qs, urlsplit


def validate_migration_target(database_url: str, target: str, authorized: str) -> None:
    if not database_url.strip():
        raise RuntimeError("Set ALEMBIC_DATABASE_URL for the explicitly selected environment")
    try:
        parsed = urlsplit(database_url)
        host = parsed.hostname
        port = parsed.port
    except ValueError:
        raise RuntimeError("Invalid migration connection configuration") from None
    if parsed.scheme not in {"postgresql", "postgresql+psycopg2", "postgresql+pg8000"}:
        raise RuntimeError("ALEMBIC_DATABASE_URL must use PostgreSQL")
    if authorized != "1":
        raise RuntimeError("Set ALEMBIC_ALLOW_DATA_MIGRATION=1 to authorize this admin command")
    if target == "local-development":
        if (host != "127.0.0.1" or port != 5442 or parsed.path != "/moviegraph_local"
                or parsed.username != "moviegraph_local" or parsed.query or parsed.fragment):
            raise RuntimeError("Local migrations require MovieGraph's isolated loopback database on port 5442")
        return
    if target != "neon-development":
        raise RuntimeError("Choose ALEMBIC_TARGET=local-development or neon-development; production is not enabled")
    if not host or not host.endswith(".neon.tech"):
        raise RuntimeError("ALEMBIC_DATABASE_URL must target a Neon endpoint")
    if "-pooler." in host:
        raise RuntimeError("ALEMBIC_DATABASE_URL must use the direct, unpooled Neon endpoint")
    ssl_modes = parse_qs(parsed.query).get("sslmode", [])
    if not ssl_modes or ssl_modes[0] not in {"require", "verify-ca", "verify-full"}:
        raise RuntimeError("ALEMBIC_DATABASE_URL must require TLS with sslmode=require or stronger")


def validate_migration_environment() -> str:
    database_url = os.environ.get("ALEMBIC_DATABASE_URL", "").strip()
    validate_migration_target(database_url, os.environ.get("ALEMBIC_TARGET", ""),
                              os.environ.get("ALEMBIC_ALLOW_DATA_MIGRATION", ""))
    return database_url
