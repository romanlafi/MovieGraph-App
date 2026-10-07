import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect, text


MIGRATION_PATH = Path(__file__).resolve().parents[1] / "migrations/versions/20261007_00_worker_auth_preferences.py"
FOLLOWS_MIGRATION_PATH = Path(__file__).resolve().parents[1] / "migrations/versions/20261008_00_worker_follows.py"


def run_migration(connection):
    spec = importlib.util.spec_from_file_location("worker_auth_preference_migration_fixture", MIGRATION_PATH)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    operations = Operations(MigrationContext.configure(connection))
    with patch.object(migration, "op", operations):
        migration.upgrade()


def run_follows_migration(connection):
    spec = importlib.util.spec_from_file_location("worker_follows_migration_fixture", FOLLOWS_MIGRATION_PATH)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    operations = Operations(MigrationContext.configure(connection))
    with patch.object(migration, "op", operations):
        migration.upgrade()


class WorkerAuthMigrationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite+pysqlite:///:memory:")

    def tearDown(self):
        self.engine.dispose()

    def test_migration_preserves_legacy_user_genre_names(self):
        with self.engine.begin() as connection:
            connection.execute(text("""
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY, email VARCHAR NOT NULL, username VARCHAR NOT NULL,
                    password VARCHAR NOT NULL, birthdate DATE, bio VARCHAR
                )
            """))
            connection.execute(text("CREATE TABLE genres (id INTEGER PRIMARY KEY, name VARCHAR UNIQUE)"))
            connection.execute(text("""
                CREATE TABLE user_genres (
                    user_id INTEGER NOT NULL, genre_id INTEGER NOT NULL,
                    PRIMARY KEY (user_id, genre_id)
                )
            """))
            connection.execute(text("INSERT INTO users VALUES (1, 'fixture@example.test', 'fixture', 'hash', NULL, NULL)"))
            connection.execute(text("INSERT INTO genres VALUES (10, 'Sci-Fi'), (11, 'Biography')"))
            connection.execute(text("INSERT INTO user_genres VALUES (1, 10), (1, 11)"))

            run_migration(connection)

            self.assertEqual(connection.execute(text(
                "SELECT genre_name FROM user_genre_preferences WHERE user_id=1 ORDER BY genre_name"
            )).scalars().all(), ["Biography", "Sci-Fi"])
            self.assertTrue(any(index["unique"] and index["column_names"] == ["username"]
                                for index in inspect(connection).get_indexes("users")))
            self.assertIn("genres", inspect(connection).get_table_names())
            self.assertIn("user_genres", inspect(connection).get_table_names())

    def test_migration_refuses_duplicate_usernames_without_creating_preferences(self):
        with self.engine.begin() as connection:
            connection.execute(text("""
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY, email VARCHAR NOT NULL, username VARCHAR NOT NULL,
                    password VARCHAR NOT NULL, birthdate DATE, bio VARCHAR
                )
            """))
            connection.execute(text("""
                INSERT INTO users VALUES
                (1, 'one@example.test', 'shared', 'hash', NULL, NULL),
                (2, 'two@example.test', 'shared', 'hash', NULL, NULL)
            """))
            with self.assertRaisesRegex(RuntimeError, "duplicate username group"):
                run_migration(connection)
            self.assertNotIn("user_genre_preferences", inspect(connection).get_table_names())

    def test_follow_migration_preserves_and_indexes_existing_relations(self):
        with self.engine.begin() as connection:
            connection.execute(text("""
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY, email VARCHAR NOT NULL, username VARCHAR NOT NULL,
                    password VARCHAR NOT NULL
                )
            """))
            connection.execute(text("""
                CREATE TABLE user_follows (
                    follower_id INTEGER NOT NULL, followed_id INTEGER NOT NULL,
                    FOREIGN KEY (follower_id) REFERENCES users(id),
                    FOREIGN KEY (followed_id) REFERENCES users(id),
                    PRIMARY KEY (follower_id, followed_id)
                )
            """))
            connection.execute(text("INSERT INTO users VALUES (1, 'one@example.test', 'one', 'hash')"))
            connection.execute(text("INSERT INTO users VALUES (2, 'two@example.test', 'two', 'hash')"))
            connection.execute(text("INSERT INTO user_follows VALUES (1, 2)"))

            run_follows_migration(connection)

            self.assertEqual(connection.execute(text(
                "SELECT follower_id, followed_id FROM user_follows"
            )).tuples().all(), [(1, 2)])
            indexes = inspect(connection).get_indexes("user_follows")
            self.assertTrue(any(index["column_names"] == ["followed_id"] for index in indexes))

    def test_follow_migration_bootstraps_empty_schema_and_rejects_orphans(self):
        with self.engine.begin() as connection:
            connection.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY)"))
            run_follows_migration(connection)
            self.assertIn("user_follows", inspect(connection).get_table_names())
            connection.execute(text("INSERT INTO users VALUES (1)"))
            connection.execute(text("INSERT INTO user_follows VALUES (99, 1)"))
            with self.assertRaisesRegex(RuntimeError, "orphan relation"):
                run_follows_migration(connection)


if __name__ == "__main__":
    unittest.main()
