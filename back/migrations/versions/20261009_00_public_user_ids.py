"""Add stable, non-sensitive public identifiers to social profiles.

Revision ID: 20261009_00
Revises: 20261008_00
"""

from uuid import uuid4

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


revision = "20261009_00"
down_revision = "20261008_00"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = inspect(connection)
    if "users" not in inspector.get_table_names():
        raise RuntimeError("Cannot add public user identifiers without the users table")

    columns = {column["name"] for column in inspector.get_columns("users")}
    if "public_id" in columns:
        raise RuntimeError("Unexpected users schema; public_id already exists")

    original_user_count = connection.execute(text("SELECT count(*) FROM users")).scalar_one()
    op.add_column("users", sa.Column("public_id", sa.String(length=36), nullable=True))
    user_ids = connection.execute(text("SELECT id FROM users")).scalars().all()
    for user_id in user_ids:
        connection.execute(
            text("UPDATE users SET public_id=:public_id WHERE id=:user_id"),
            {"public_id": str(uuid4()), "user_id": user_id},
        )

    missing_ids = connection.execute(text(
        "SELECT count(*) FROM users WHERE public_id IS NULL OR public_id = ''"
    )).scalar_one()
    if missing_ids:
        raise RuntimeError(f"Public identifier backfill failed for {missing_ids} user(s)")
    migrated_user_count = connection.execute(text("SELECT count(*) FROM users")).scalar_one()
    if migrated_user_count != original_user_count:
        raise RuntimeError(
            f"Public identifier migration changed user count: {original_user_count} -> {migrated_user_count}"
        )

    if connection.dialect.name != "sqlite":
        op.alter_column("users", "public_id", existing_type=sa.String(length=36), nullable=False)
    op.create_index("uq_users_public_id", "users", ["public_id"], unique=True)


def downgrade() -> None:
    raise RuntimeError("Public user IDs are forward-only; preserve IDs and profile links")
