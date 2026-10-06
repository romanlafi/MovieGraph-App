"""Add TMDB identities to MovieGraph comments and likes.

Revision ID: 20261006_01
Revises: 20261006_00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text

from app.services.social_migration_integrity import (
    expected_tmdb_like_pairs,
    invalid_legacy_like_rows,
    unmapped_comment_rows,
)


revision = "20261006_01"
down_revision = "20261006_00"
branch_labels = None
depends_on = None


def _require_columns(inspector, table_name: str, required: set[str]) -> None:
    if table_name not in inspector.get_table_names():
        raise RuntimeError(f"Required legacy table is missing: {table_name}")
    actual = {column["name"] for column in inspector.get_columns(table_name)}
    if not required.issubset(actual):
        missing = ", ".join(sorted(required - actual))
        raise RuntimeError(f"Unexpected {table_name} schema; missing columns: {missing}")


def _column_type(inspector, table_name: str, column_name: str):
    return next(
        column["type"]
        for column in inspector.get_columns(table_name)
        if column["name"] == column_name
    )


def _load_legacy_likes(connection, inspector):
    sources = []
    tables = set(inspector.get_table_names())
    for source_name in ("user_likes", "likes"):
        if source_name not in tables:
            continue

        required = {"user_id", "movie_id"} | ({"id"} if source_name == "likes" else set())
        _require_columns(inspector, source_name, required)
        source_id = "l.id," if source_name == "likes" else ""
        result = connection.execute(text(
            f"SELECT {source_id} l.user_id, l.movie_id, m.tmdb_id, (u.id IS NOT NULL) AS valid_user "
            f"FROM {source_name} AS l "
            "LEFT JOIN movies AS m ON m.id = l.movie_id "
            "LEFT JOIN users AS u ON u.id = l.user_id"
        ))
        for row in result.mappings():
            legacy_id = row.get("id")
            user_id = row.get("user_id")
            movie_id = row.get("movie_id")
            sources.append({
                "source": source_name,
                "legacy_id": legacy_id,
                "user_id": user_id,
                "movie_id": movie_id,
                "tmdb_movie_id": row["tmdb_id"],
                "valid_user": row["valid_user"],
            })
    if not sources and not tables.intersection({"user_likes", "likes"}):
        raise RuntimeError("Neither legacy likes source exists; inspect database history before proceeding")
    return sources


def _identity_errors(label: str, bad_rows: list[dict]) -> str:
    row_ids = [
        f"{row['source']}:{row['legacy_id'] if row['legacy_id'] is not None else (row['user_id'], row['movie_id'])}"
        for row in bad_rows
    ]
    return f"{label}: {len(bad_rows)} row(s); identifiers={row_ids}"


def _create_empty_database_social_schema() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("password", sa.String(), nullable=False),
        sa.Column("birthdate", sa.Date(), nullable=True),
        sa.Column("bio", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("movie_id", sa.Integer(), nullable=True),
        sa.Column("tmdb_movie_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("tmdb_movie_id > 0", name="ck_comments_tmdb_movie_id_positive"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id", name="pk_comments"),
    )
    op.create_index("ix_comments_id", "comments", ["id"], unique=False)
    op.create_index("ix_comments_tmdb_movie_id", "comments", ["tmdb_movie_id"], unique=False)
    op.create_table(
        "user_movie_likes",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("tmdb_movie_id", sa.Integer(), nullable=False),
        sa.CheckConstraint("tmdb_movie_id > 0", name="ck_user_movie_likes_tmdb_movie_id_positive"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("user_id", "tmdb_movie_id", name="pk_user_movie_likes"),
    )
    op.create_index("ix_user_movie_likes_tmdb_movie_id", "user_movie_likes", ["tmdb_movie_id"], unique=False)


def upgrade() -> None:
    connection = op.get_bind()
    inspector = inspect(connection)
    tables = set(inspector.get_table_names()) - {"alembic_version"}
    if not tables:
        _create_empty_database_social_schema()
        return
    _require_columns(inspector, "comments", {"id", "user_id", "movie_id", "text", "created_at"})
    _require_columns(inspector, "movies", {"id", "tmdb_id"})
    _require_columns(inspector, "users", {"id"})
    if not tables.intersection({"user_likes", "likes"}):
        raise RuntimeError("Neither legacy likes source exists; inspect database history before proceeding")
    if "user_likes" in tables:
        _require_columns(inspector, "user_likes", {"user_id", "movie_id"})
    if "tmdb_movie_id" in {column["name"] for column in inspector.get_columns("comments")}:
        raise RuntimeError("comments.tmdb_movie_id already exists; inspect migration state before proceeding")
    for table_name in ("user_movie_likes", "user_movie_like_sources"):
        if table_name in tables:
            raise RuntimeError(f"{table_name} already exists; inspect migration state before proceeding")

    user_id_type = _column_type(inspector, "users", "id")
    movie_id_type = _column_type(inspector, "movies", "id")
    tmdb_movie_id_type = _column_type(inspector, "movies", "tmdb_id")
    legacy_like_id_type = _column_type(inspector, "likes", "id") if "likes" in tables else sa.Integer()
    comment_movie_id_type = _column_type(inspector, "comments", "movie_id")

    comments = connection.execute(text(
        "SELECT c.id, c.user_id, c.movie_id, u.id AS mapped_user_id, "
        "m.id AS mapped_movie_id, m.tmdb_id "
        "FROM comments c LEFT JOIN users u ON u.id = c.user_id "
        "LEFT JOIN movies m ON m.id = c.movie_id ORDER BY c.id"
    )).mappings().all()
    invalid_comments = unmapped_comment_rows(comments)
    if invalid_comments:
        raise RuntimeError(_identity_errors("Unmappable comments", [
            {"source": "comments", "legacy_id": row["id"], "user_id": None, "movie_id": row["movie_id"]}
            for row in invalid_comments
        ]))
    if len(comments) != connection.execute(text("SELECT count(*) FROM comments")).scalar_one():
        raise RuntimeError("Comment baseline row count changed during mapping inspection")

    raw_likes = _load_legacy_likes(connection, inspector)
    invalid_likes = invalid_legacy_like_rows(raw_likes)
    if invalid_likes:
        raise RuntimeError(_identity_errors("Unmappable legacy likes", invalid_likes))

    expected_pairs = expected_tmdb_like_pairs(raw_likes)

    op.add_column("comments", sa.Column("tmdb_movie_id", tmdb_movie_id_type, nullable=True))
    connection.execute(text(
        "UPDATE comments AS c SET tmdb_movie_id = m.tmdb_id "
        "FROM movies AS m WHERE c.movie_id = m.id"
    ))
    backfill_issues = connection.execute(text(
        "SELECT count(*) FROM comments c "
        "LEFT JOIN movies m ON m.id = c.movie_id "
        "LEFT JOIN users u ON u.id = c.user_id "
        "WHERE c.tmdb_movie_id IS NULL OR c.tmdb_movie_id <= 0 "
        "OR c.tmdb_movie_id IS DISTINCT FROM m.tmdb_id OR u.id IS NULL"
    )).scalar_one()
    if backfill_issues:
        raise RuntimeError(f"Comment backfill verification failed: {backfill_issues} mismatched or unmapped rows")
    original_comment_count = len(comments)
    if connection.execute(text("SELECT count(*) FROM comments")).scalar_one() != original_comment_count:
        raise RuntimeError("Comment row count changed during TMDB ID backfill")
    op.alter_column("comments", "tmdb_movie_id", existing_type=tmdb_movie_id_type, nullable=False)
    op.create_index("ix_comments_tmdb_movie_id", "comments", ["tmdb_movie_id"])
    op.create_check_constraint(
        "ck_comments_tmdb_movie_id_positive",
        "comments",
        "tmdb_movie_id > 0",
    )
    op.alter_column("comments", "movie_id", existing_type=comment_movie_id_type, nullable=True)

    op.create_table(
        "user_movie_likes",
        sa.Column("user_id", user_id_type, nullable=False),
        sa.Column("tmdb_movie_id", tmdb_movie_id_type, nullable=False),
        sa.CheckConstraint("tmdb_movie_id > 0", name="ck_user_movie_likes_tmdb_movie_id_positive"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("user_id", "tmdb_movie_id", name="pk_user_movie_likes"),
    )
    op.create_index("ix_user_movie_likes_tmdb_movie_id", "user_movie_likes", ["tmdb_movie_id"])
    op.create_table(
        "user_movie_like_sources",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("legacy_source", sa.String(length=80), nullable=False),
        sa.Column("legacy_id", legacy_like_id_type, nullable=True),
        sa.Column("legacy_user_id", user_id_type, nullable=False),
        sa.Column("legacy_movie_id", movie_id_type, nullable=False),
        sa.Column("tmdb_movie_id", tmdb_movie_id_type, nullable=False),
    )

    like_rows = [{
        "user_id": user_id,
        "tmdb_movie_id": tmdb_movie_id,
    } for user_id, tmdb_movie_id in sorted(expected_pairs)]
    if like_rows:
        op.bulk_insert(sa.table(
            "user_movie_likes",
            sa.column("user_id", user_id_type),
            sa.column("tmdb_movie_id", tmdb_movie_id_type),
        ), like_rows)

    provenance_rows = [{
        "legacy_source": row["source"],
        "legacy_id": row["legacy_id"],
        "legacy_user_id": row["user_id"],
        "legacy_movie_id": row["movie_id"],
        "tmdb_movie_id": row["tmdb_movie_id"],
    } for row in raw_likes]
    if provenance_rows:
        op.bulk_insert(sa.table(
            "user_movie_like_sources",
            sa.column("legacy_source", sa.String()),
            sa.column("legacy_id", legacy_like_id_type),
            sa.column("legacy_user_id", user_id_type),
            sa.column("legacy_movie_id", movie_id_type),
            sa.column("tmdb_movie_id", tmdb_movie_id_type),
        ), provenance_rows)

    provenance_count = connection.execute(text(
        "SELECT count(*) FROM user_movie_like_sources"
    )).scalar_one()
    if provenance_count != len(raw_likes):
        raise RuntimeError(
            f"Like provenance integrity check failed: {provenance_count} ledger rows for {len(raw_likes)} source rows"
        )

    actual_pairs = set(connection.execute(text(
        "SELECT user_id, tmdb_movie_id FROM user_movie_likes"
    )).tuples())
    if expected_pairs != actual_pairs:
        missing = sorted(expected_pairs - actual_pairs)
        unexpected = sorted(actual_pairs - expected_pairs)
        raise RuntimeError(
            f"Like set integrity check failed: expected EXCEPT target={missing}; target EXCEPT expected={unexpected}"
        )


def downgrade() -> None:
    raise RuntimeError(
        "This migration cannot be downgraded after social writes use TMDB IDs; restore a verified Neon branch/snapshot instead."
    )
