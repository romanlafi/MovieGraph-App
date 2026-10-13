import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
from uuid import UUID

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect, text


MIGRATION_PATH = Path(__file__).resolve().parents[1] / "migrations/versions/20261009_00_public_user_ids.py"


def run_migration(connection):
    spec = importlib.util.spec_from_file_location("public_user_id_migration_fixture", MIGRATION_PATH)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    operations = Operations(MigrationContext.configure(connection))
    with patch.object(migration, "op", operations):
        migration.upgrade()


class PublicUserIdMigrationTests(unittest.TestCase):
    def test_migration_backfills_unique_public_ids_for_existing_users(self):
        engine = create_engine("sqlite+pysqlite:///:memory:")
        try:
            with engine.begin() as connection:
                connection.execute(text("""
                    CREATE TABLE users (
                        id INTEGER PRIMARY KEY,
                        email VARCHAR NOT NULL,
                        username VARCHAR NOT NULL,
                        password VARCHAR NOT NULL
                    )
                """))
                connection.execute(text("""
                    INSERT INTO users (id, email, username, password) VALUES
                    (1, 'first@example.test', 'first', 'hash'),
                    (2, 'second@example.test', 'second', 'hash')
                """))

                run_migration(connection)

                public_ids = connection.execute(text(
                    "SELECT public_id FROM users ORDER BY id"
                )).scalars().all()
                self.assertEqual(len(set(public_ids)), 2)
                for public_id in public_ids:
                    self.assertEqual(str(UUID(public_id)), public_id)
                self.assertTrue(any(
                    index["unique"] and index["column_names"] == ["public_id"]
                    for index in inspect(connection).get_indexes("users")
                ))
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
