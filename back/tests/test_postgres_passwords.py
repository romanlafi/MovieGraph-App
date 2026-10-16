"""Optional real PostgreSQL checks; extension changes are rolled back."""

import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from app.social.passwords import (hash_password, hash_password_in_database,
                                  verify_password, verify_password_in_database)


@unittest.skipUnless(os.getenv("PASSWORD_TEST_DATABASE_URL"), "Explicit local PostgreSQL test URL required")
class PostgresPasswordTests(unittest.TestCase):
    def test_migration_and_bcrypt_interoperability_without_rewriting_stored_hashes(self):
        database_url = make_url(os.environ["PASSWORD_TEST_DATABASE_URL"])
        self.assertEqual(database_url.host, "127.0.0.1")
        self.assertEqual(database_url.port, 5442)
        self.assertEqual(database_url.database, "moviegraph_local")
        migration_path = Path(__file__).resolve().parents[1] / "migrations/versions/20261016_00_password_crypto.py"
        specification = importlib.util.spec_from_file_location("password_crypto_migration", migration_path)
        migration = importlib.util.module_from_spec(specification)
        specification.loader.exec_module(migration)
        engine = create_engine(database_url, poolclass=NullPool, hide_parameters=True)
        try:
            with engine.connect() as connection:
                transaction = connection.begin()
                try:
                    with patch.object(migration.op, "get_bind", return_value=connection):
                        migration.upgrade()
                        migration.upgrade()
                    self.assertEqual(connection.scalar(text("SHOW server_encoding")), "UTF8")
                    with Session(bind=connection) as database:
                        fixed_hash = "$2a$10$WvvTPHKwdBJ3uk0Z37EMR.hLA2W6N9AEBhEgrAOljy2Ae5MtaSIUi"
                        self.assertTrue(verify_password_in_database(database, "abc", fixed_hash))
                        self.assertFalse(verify_password_in_database(database, "wrong", fixed_hash))
                        for password in ("a-long-enough-password", "contraseña🎬", "é" * 36):
                            with self.subTest(password_length=len(password.encode("utf-8"))):
                                legacy_hash = hash_password(password)
                                for prefix in ("$2a$", "$2b$", "$2y$"):
                                    self.assertTrue(verify_password_in_database(database, password, prefix + legacy_hash[4:]))
                                generated_hash = hash_password_in_database(database, password)
                                self.assertTrue(generated_hash.startswith("$2a$12$"))
                                self.assertTrue(verify_password(password, generated_hash))
                                self.assertTrue(verify_password_in_database(database, password, generated_hash))
                                self.assertFalse(verify_password_in_database(database, "wrong", generated_hash))
                                self.assertFalse(verify_password("wrong", generated_hash))
                finally:
                    transaction.rollback()
        finally:
            engine.dispose()
