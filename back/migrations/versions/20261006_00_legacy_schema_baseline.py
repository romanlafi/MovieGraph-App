"""Validate a pre-existing schema or allow a confirmed empty development database.

Revision ID: 20261006_00
Revises:
"""

from alembic import op
from sqlalchemy import inspect


revision = "20261006_00"
down_revision = None
branch_labels = None
depends_on = None


def _require_columns(inspector, table_name: str, required: set[str]) -> None:
    tables = set(inspector.get_table_names())
    if table_name not in tables:
        raise RuntimeError(f"Cannot baseline this schema: required table {table_name} is missing")
    columns = {column["name"] for column in inspector.get_columns(table_name)}
    if not required.issubset(columns):
        missing = ", ".join(sorted(required - columns))
        raise RuntimeError(f"Cannot baseline this schema: {table_name} is missing columns {missing}")


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    tables = set(inspector.get_table_names()) - {"alembic_version"}
    if not tables:
        return
    _require_columns(inspector, "users", {"id"})
    _require_columns(inspector, "movies", {"id", "tmdb_id"})
    _require_columns(inspector, "comments", {"id", "user_id", "movie_id", "text", "created_at"})
    like_sources = tables & {"user_likes", "likes"}
    if not like_sources:
        raise RuntimeError("Cannot baseline this schema: neither legacy like table exists")
    if "user_likes" in like_sources:
        _require_columns(inspector, "user_likes", {"user_id", "movie_id"})
    if "likes" in like_sources:
        _require_columns(inspector, "likes", {"id", "user_id", "movie_id"})


def downgrade() -> None:
    raise RuntimeError("The legacy schema baseline is historical metadata and cannot be removed automatically")
