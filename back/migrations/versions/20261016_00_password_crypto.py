"""Enable PostgreSQL bcrypt without rewriting existing password hashes."""

from alembic import op
from sqlalchemy import text


revision = "20261016_00"
down_revision = "20261009_00"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name == "postgresql":
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public"))
        if not connection.scalar(text(
            "SELECT to_regprocedure('public.crypt(text,text)') IS NOT NULL "
            "AND to_regprocedure('public.gen_salt(text,integer)') IS NOT NULL"
        )):
            raise RuntimeError("pgcrypto password functions must be installed in the public schema")


def downgrade() -> None:
    raise RuntimeError("Keep pgcrypto: existing accounts and other applications may depend on it")
