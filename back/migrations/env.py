import os
from logging.config import fileConfig
from urllib.parse import parse_qs, urlsplit

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.db.database import Base
from app.models import comment, collection, genre, like, movie, movie_person, person, user, user_movie_like, user_movie_like_source


config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

database_url = os.environ.get("ALEMBIC_DATABASE_URL", "").strip()
if not database_url:
    raise RuntimeError("Set ALEMBIC_DATABASE_URL to the confirmed Neon development branch")
parsed_url = urlsplit(database_url)
ssl_modes = parse_qs(parsed_url.query).get("sslmode", [])
if parsed_url.scheme not in {"postgresql", "postgresql+psycopg2", "postgresql+pg8000"}:
    raise RuntimeError("ALEMBIC_DATABASE_URL must use PostgreSQL")
if not parsed_url.hostname or ".neon.tech" not in parsed_url.hostname:
    raise RuntimeError("ALEMBIC_DATABASE_URL must target a Neon endpoint")
if "-pooler." in parsed_url.hostname:
    raise RuntimeError("ALEMBIC_DATABASE_URL must use the direct, unpooled Neon endpoint")
if not ssl_modes or ssl_modes[0] not in {"require", "verify-ca", "verify-full"}:
    raise RuntimeError("ALEMBIC_DATABASE_URL must require TLS with sslmode=require or stronger")
if os.environ.get("ALEMBIC_TARGET") != "neon-development":
    raise RuntimeError("Set ALEMBIC_TARGET=neon-development after confirming the target branch")
if os.environ.get("ALEMBIC_ALLOW_DATA_MIGRATION") != "1":
    raise RuntimeError("Set ALEMBIC_ALLOW_DATA_MIGRATION=1 to explicitly authorize this admin command")

config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        hide_parameters=True,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            transaction_per_migration=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
