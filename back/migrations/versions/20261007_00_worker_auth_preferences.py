"""Additive account preferences and username uniqueness for Worker auth.

Revision ID: 20261007_00
Revises: 20261006_01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


revision = "20261007_00"
down_revision = "20261006_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = inspect(connection)
    tables = set(inspector.get_table_names())
    if "users" not in tables:
        raise RuntimeError("Cannot add Worker auth without the users table")
    if "user_genre_preferences" in tables:
        raise RuntimeError("user_genre_preferences already exists; inspect migration state before proceeding")

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    required_user_columns = {"id", "email", "username", "password", "birthdate", "bio"}
    missing = required_user_columns - user_columns
    if missing:
        raise RuntimeError(f"Unexpected users schema; missing columns: {', '.join(sorted(missing))}")

    duplicate_usernames = connection.execute(text(
        "SELECT count(*) FROM (SELECT username FROM users GROUP BY username HAVING count(*) > 1) duplicates"
    )).scalar_one()
    if duplicate_usernames:
        raise RuntimeError(f"Cannot enforce username uniqueness: {duplicate_usernames} duplicate username group(s)")

    if not any(index["unique"] and index["column_names"] == ["username"]
               for index in inspector.get_indexes("users")):
        op.create_index("ix_users_username", "users", ["username"], unique=True)
    user_id_type = next(column["type"] for column in inspector.get_columns("users") if column["name"] == "id")

    has_genres = "genres" in tables
    has_user_genres = "user_genres" in tables
    if has_genres != has_user_genres:
        raise RuntimeError("Expected both legacy genres and user_genres tables or neither")
    if has_genres:
        genre_columns = {column["name"] for column in inspector.get_columns("genres")}
        association_columns = {column["name"] for column in inspector.get_columns("user_genres")}
        if not {"id", "name"}.issubset(genre_columns) or not {"user_id", "genre_id"}.issubset(association_columns):
            raise RuntimeError("Unexpected legacy user genre preference schema")
        orphaned = connection.execute(text(
            "SELECT count(*) FROM user_genres ug "
            "LEFT JOIN users u ON u.id = ug.user_id "
            "LEFT JOIN genres g ON g.id = ug.genre_id "
            "WHERE u.id IS NULL OR g.id IS NULL"
        )).scalar_one()
        if orphaned:
            raise RuntimeError(f"Cannot migrate user genre preferences: {orphaned} orphaned relation(s)")
        expected_preference_count = connection.execute(text("SELECT count(*) FROM user_genres")).scalar_one()
    else:
        expected_preference_count = 0

    op.create_table(
        "user_genre_preferences",
        sa.Column("user_id", user_id_type, nullable=False),
        sa.Column("genre_name", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "genre_name", name="pk_user_genre_preferences"),
    )
    if has_genres:
        connection.execute(text(
            "INSERT INTO user_genre_preferences (user_id, genre_name) "
            "SELECT ug.user_id, g.name FROM user_genres ug "
            "JOIN genres g ON g.id = ug.genre_id"
        ))
        missing_preferences = connection.execute(text(
            "SELECT count(*) FROM (SELECT ug.user_id, g.name AS genre_name FROM user_genres ug "
            "JOIN genres g ON g.id = ug.genre_id EXCEPT "
            "SELECT user_id, genre_name FROM user_genre_preferences) differences"
        )).scalar_one()
        extra_preferences = connection.execute(text(
            "SELECT count(*) FROM (SELECT user_id, genre_name FROM user_genre_preferences EXCEPT "
            "SELECT ug.user_id, g.name AS genre_name FROM user_genres ug "
            "JOIN genres g ON g.id = ug.genre_id) differences"
        )).scalar_one()
        mapping_differences = missing_preferences + extra_preferences
    else:
        mapping_differences = connection.execute(text(
            "SELECT count(*) FROM user_genre_preferences"
        )).scalar_one()
    mapped_preference_count = connection.execute(text(
        "SELECT count(*) FROM user_genre_preferences"
    )).scalar_one()
    if mapped_preference_count != expected_preference_count or mapping_differences:
        raise RuntimeError(
            f"User genre preference integrity failed: expected={expected_preference_count}, "
            f"mapped={mapped_preference_count}, differences={mapping_differences}"
        )


def downgrade() -> None:
    raise RuntimeError("Worker account preferences are forward-only; preserve new user preference data")
