"""Validate and expose the existing user follow relation to the Worker.

Revision ID: 20261008_00
Revises: 20261007_00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


revision = "20261008_00"
down_revision = "20261007_00"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = inspect(connection)
    tables = set(inspector.get_table_names())
    if "users" not in tables:
        raise RuntimeError("Cannot migrate follows without the users table")

    user_id_type = next(
        (column["type"] for column in inspector.get_columns("users") if column["name"] == "id"),
        None,
    )
    if user_id_type is None:
        raise RuntimeError("Unexpected users schema; missing id column")

    if "user_follows" not in tables:
        op.create_table(
            "user_follows",
            sa.Column("follower_id", user_id_type, nullable=False),
            sa.Column("followed_id", user_id_type, nullable=False),
            sa.ForeignKeyConstraint(["follower_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["followed_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("follower_id", "followed_id", name="pk_user_follows"),
        )
        tables.add("user_follows")

    follow_columns = {column["name"] for column in inspect(connection).get_columns("user_follows")}
    required = {"follower_id", "followed_id"}
    if not required.issubset(follow_columns):
        missing = ", ".join(sorted(required - follow_columns))
        raise RuntimeError(f"Unexpected user_follows schema; missing columns: {missing}")

    foreign_keys = inspect(connection).get_foreign_keys("user_follows")
    required_foreign_keys = {
        ("follower_id", "users"),
        ("followed_id", "users"),
    }
    actual_foreign_keys = {
        (column, foreign_key["referred_table"])
        for foreign_key in foreign_keys
        for column in foreign_key.get("constrained_columns", [])
    }
    if not required_foreign_keys.issubset(actual_foreign_keys):
        raise RuntimeError("Unexpected user_follows schema; expected foreign keys to users.id")

    expected_pairs = set(connection.execute(text(
        "SELECT follower_id, followed_id FROM user_follows"
    )).tuples())
    orphan_count = connection.execute(text(
        "SELECT count(*) FROM user_follows f "
        "LEFT JOIN users follower ON follower.id = f.follower_id "
        "LEFT JOIN users followed ON followed.id = f.followed_id "
        "WHERE follower.id IS NULL OR followed.id IS NULL"
    )).scalar_one()
    if orphan_count:
        raise RuntimeError(f"Cannot migrate follows: {orphan_count} orphan relation(s)")

    duplicate_count = connection.execute(text(
        "SELECT count(*) FROM (SELECT follower_id, followed_id FROM user_follows "
        "GROUP BY follower_id, followed_id HAVING count(*) > 1) duplicates"
    )).scalar_one()
    if duplicate_count:
        raise RuntimeError(f"Cannot enforce follow uniqueness: {duplicate_count} duplicate pair(s)")

    current = inspect(connection)
    has_unique_pair = any(
        constraint.get("column_names") == ["follower_id", "followed_id"]
        for constraint in current.get_unique_constraints("user_follows")
    ) or current.get_pk_constraint("user_follows").get("constrained_columns") == ["follower_id", "followed_id"] or any(
        index.get("unique") and index.get("column_names") == ["follower_id", "followed_id"]
        for index in current.get_indexes("user_follows")
    )
    if not has_unique_pair:
        op.create_index("uq_user_follows_pair", "user_follows", ["follower_id", "followed_id"], unique=True)

    current = inspect(connection)
    if not any(index.get("column_names") == ["followed_id"] for index in current.get_indexes("user_follows")):
        op.create_index("ix_user_follows_followed_id", "user_follows", ["followed_id"])

    target_pairs = set(connection.execute(text(
        "SELECT follower_id, followed_id FROM user_follows"
    )).tuples())
    missing_pairs = sorted(expected_pairs - target_pairs)
    unexpected_pairs = sorted(target_pairs - expected_pairs)
    if missing_pairs or unexpected_pairs:
        raise RuntimeError(
            f"Follow integrity failed: expected EXCEPT target={missing_pairs}; "
            f"target EXCEPT expected={unexpected_pairs}"
        )


def downgrade() -> None:
    raise RuntimeError("Worker follow rollout is forward-only; preserve follow data during rollback")
