"""Real JWT verification and SQLite DML; Hyperdrive configuration is mocked."""

import asyncio
from datetime import datetime, timedelta, UTC
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from uuid import uuid4

from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi import Request
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError

from app.application import create_app
from app.social import routes, store
from test_foundation import isolated


SECRET = "worker-social-test-only"
MIGRATION_PATH = Path(__file__).resolve().parents[1] / "migrations/versions/20261006_01_social_tmdb_ids.py"
AUTH_MIGRATION_PATH = Path(__file__).resolve().parents[1] / "migrations/versions/20261007_00_worker_auth_preferences.py"
FOLLOWS_MIGRATION_PATH = Path(__file__).resolve().parents[1] / "migrations/versions/20261008_00_worker_follows.py"


def token(email="first@example.test", *, secret=SECRET, expires=True, algorithm="HS256"):
    claims = {"sub": email}
    if expires is not None:
        claims["exp"] = datetime.now(UTC) + timedelta(minutes=5 if expires else -5)
    return jwt.encode(claims, secret, algorithm=algorithm)


class SocialWorkerTests(unittest.TestCase):
    def setUp(self):
        self.directory = TemporaryDirectory()
        self.database_url = f"sqlite+pysqlite:///{Path(self.directory.name) / 'social.db'}"
        self.engine = create_engine(self.database_url)
        with self.engine.begin() as connection:
            for module_name, path in (("worker_social_migration_fixture", MIGRATION_PATH),
                                      ("worker_auth_migration_fixture", AUTH_MIGRATION_PATH),
                                      ("worker_follows_migration_fixture", FOLLOWS_MIGRATION_PATH)):
                spec = importlib.util.spec_from_file_location(module_name, path)
                migration = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(migration)
                operations = Operations(MigrationContext.configure(connection))
                with patch.object(migration, "op", operations):
                    migration.upgrade()
            connection.execute(text("""
                INSERT INTO users (id, email, username, password)
                VALUES (1, 'first@example.test', 'first', 'unused'),
                       (2, 'second@example.test', 'second', 'unused')
            """))
        config = SimpleNamespace(url=make_url(self.database_url), worker=False)
        self.config_patch = patch.object(routes.runtime, "request_database_config", return_value=config)
        self.config_resolver = self.config_patch.start()
        self.app = create_app(include_legacy_api=False, include_social_api=True,
                              include_account_api=True, include_follows_api=True)
        self.env = {"SECRET_KEY": SECRET, "JWT_ALGORITHM": "HS256"}

        @self.app.middleware("http")
        async def worker_bindings(request, call_next):
            request.scope["env"] = self.env
            return await call_next(request)

        self.client = TestClient(self.app)
        self.headers = {"Authorization": f"Bearer {token()}"}

    def tearDown(self):
        self.client.close()
        self.config_patch.stop()
        self.engine.dispose()
        self.directory.cleanup()

    def test_authenticated_uncached_movie_flow_with_no_catalogue_tables(self):
        movie_id = 900003
        comment = self.client.post(f"/api/v1/movies/{movie_id}/comments",
                                   json={"text": "worker fixture"}, headers=self.headers)
        self.assertEqual(comment.status_code, 200, comment.text)
        self.assertEqual(comment.json()["username"], "first")
        self.assertEqual(self.client.get(f"/api/v1/movies/{movie_id}/comments").json(), [comment.json()])
        self.assertEqual(self.client.get("/api/v1/movies/550/comments").json(), [])
        for attempt in range(2):
            self.assertEqual(self.client.post(f"/api/v1/movies/{movie_id}/like", headers=self.headers).status_code, 200)
        self.assertTrue(self.client.get(f"/api/v1/movies/{movie_id}/like", headers=self.headers).json()["liked"])
        self.assertEqual(self.client.get("/api/v1/movies/likes", headers=self.headers).json(), [movie_id])
        second_headers = {"Authorization": f"Bearer {token('second@example.test')}"}
        self.assertFalse(self.client.get(f"/api/v1/movies/{movie_id}/like", headers=second_headers).json()["liked"])
        self.assertEqual(self.client.get("/api/v1/movies/likes", headers=second_headers).json(), [])
        with self.engine.connect() as connection:
            self.assertEqual(connection.execute(text("SELECT count(*) FROM user_movie_likes")).scalar_one(), 1)
            self.assertEqual(connection.execute(text("SELECT user_id FROM comments")).scalar_one(), 1)
            self.assertEqual(set(inspect(connection).get_table_names()), {
                "users", "comments", "user_movie_likes", "user_genre_preferences", "user_follows",
            })
        for attempt in range(2):
            self.assertEqual(self.client.delete(f"/api/v1/movies/{movie_id}/like", headers=self.headers).status_code, 200)
        self.assertFalse(self.client.get(f"/api/v1/movies/{movie_id}/like", headers=self.headers).json()["liked"])
        self.assertEqual(self.client.get("/api/v1/movies/likes", headers=self.headers).json(), [])

    def test_missing_invalid_expired_and_wrong_algorithm_tokens_never_open_database(self):
        self.config_resolver.reset_mock()
        credentials = (None, "invalid", token(secret="wrong-key"), token(expires=False),
                       token(expires=None), token(algorithm="HS384"))
        for credential in credentials:
            headers = {"Authorization": f"Bearer {credential}"} if credential is not None else {}
            with self.subTest(credential=credential):
                self.assertEqual(self.client.post("/api/v1/movies/550/like", headers=headers).status_code, 401)
                self.assertEqual(self.client.post("/api/v1/movies/550/comments",
                                                 json={"text": "unauthorized"}, headers=headers).status_code, 401)
        self.config_resolver.assert_not_called()

    def test_unknown_user_and_missing_secret_fail_closed(self):
        headers = {"Authorization": f"Bearer {token('absent@example.test')}"}
        self.assertEqual(self.client.get("/api/v1/movies/likes", headers=headers).status_code, 401)
        self.env.pop("SECRET_KEY")
        self.config_resolver.reset_mock()
        response = self.client.post("/api/v1/movies/550/like", headers=self.headers)
        self.assertEqual(response.status_code, 503)
        self.assertNotIn(SECRET, response.text)
        self.config_resolver.assert_not_called()

    def test_positive_id_validation_and_current_comment_order(self):
        self.assertEqual(self.client.get("/api/v1/movies/0/comments").status_code, 422)
        self.assertEqual(self.client.post("/api/v1/movies/-1/like", headers=self.headers).status_code, 422)
        with self.engine.begin() as connection:
            connection.execute(text("""
                INSERT INTO comments (id, user_id, tmdb_movie_id, text, created_at)
                VALUES (11, 1, 550, 'older', '2020-01-01 00:00:00'),
                       (12, 2, 550, 'newer', '2021-01-01 00:00:00')
            """))
        response = self.client.get("/api/v1/movies/550/comments")
        self.assertEqual([(row["comment_id"], row["username"]) for row in response.json()], [(12, "second"), (11, "first")])

    def test_worker_registration_login_and_profile_preserve_account_preferences(self):
        account = {
            "username": "new-user",
            "email": "new@example.com",
            "password": "a-long-enough-password",
            "birthdate": "1990-04-12",
            "bio": "Movie fan",
            "favorite_genres": ["Drama", "Science Fiction", "Drama"],
        }
        registered = self.client.post("/api/v1/users/", json=account)
        self.assertEqual(registered.status_code, 201, registered.text)
        self.assertEqual(registered.json(), {"email": "new@example.com", "username": "new-user"})

        duplicate_email = self.client.post("/api/v1/users/", json={**account, "username": "another"})
        self.assertEqual(duplicate_email.status_code, 409)
        duplicate_username = self.client.post("/api/v1/users/", json={**account, "email": "other@example.com"})
        self.assertEqual(duplicate_username.status_code, 409)

        invalid_login = self.client.post("/api/v1/users/login", data={
            "username": account["email"], "password": "incorrect",
        })
        self.assertEqual(invalid_login.status_code, 401)
        login = self.client.post("/api/v1/users/login", data={
            "username": account["email"], "password": account["password"],
        })
        self.assertEqual(login.status_code, 200, login.text)
        access_token = login.json()["access_token"]
        profile = self.client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {access_token}"})
        self.assertEqual(profile.status_code, 200, profile.text)
        self.assertEqual(profile.json(), {
            "email": account["email"],
            "username": account["username"],
            "birthdate": account["birthdate"],
            "bio": account["bio"],
            "favorite_genres": ["Drama", "Science Fiction"],
        })
        with self.engine.connect() as connection:
            self.assertEqual(connection.execute(text("SELECT count(*) FROM users WHERE email=:email"),
                                              {"email": account["email"]}).scalar_one(), 1)
            self.assertTrue(connection.execute(text("SELECT password FROM users WHERE email=:email"),
                                               {"email": account["email"]}).scalar_one().startswith("$2b$"))
            self.assertEqual(connection.execute(text("SELECT count(*) FROM user_genre_preferences" )).scalar_one(), 2)

    def test_worker_follow_routes_preserve_contract_and_authentication(self):
        with self.engine.begin() as connection:
            connection.execute(text("UPDATE users SET email='first@example.com' WHERE id=1"))
            connection.execute(text("UPDATE users SET email='second@example.com' WHERE id=2"))
        first_headers = {"Authorization": f"Bearer {token('first@example.com')}"}
        second_headers = {"Authorization": f"Bearer {token('second@example.com')}"}
        self.assertEqual(self.client.get("/api/v1/follows/following").status_code, 401)
        self.assertEqual(self.client.post("/api/v1/follows/", json={"email": "absent@example.com"},
                                          headers=first_headers).status_code, 404)
        self.assertEqual(self.client.post("/api/v1/follows/", json={"email": "second@example.com"},
                                          headers=first_headers).status_code, 200)
        self.assertEqual(self.client.post("/api/v1/follows/", json={"email": "second@example.com"},
                                          headers=first_headers).status_code, 200)
        self.assertEqual(self.client.get("/api/v1/follows/following", headers=first_headers).json()[0]["email"],
                         "second@example.com")
        self.assertEqual(self.client.get("/api/v1/follows/followers", headers=second_headers).json()[0]["email"],
                         "first@example.com")
        self.assertEqual(self.client.get("/api/v1/follows/search?query=second", headers=first_headers).json()[0]["id"], 2)
        with self.engine.begin() as connection:
            connection.execute(text("INSERT INTO user_movie_likes VALUES (1, 550), (2, 550), (2, 680)"))
        self.assertEqual(self.client.get("/api/v1/follows/movie-likes", headers=first_headers).json(), [550, 680])
        self.assertEqual(self.client.request("DELETE", "/api/v1/follows/", json={"email": "second@example.com"},
                                              headers=first_headers).status_code, 200)
        self.assertEqual(self.client.request("DELETE", "/api/v1/follows/", json={"email": "second@example.com"},
                                              headers=first_headers).status_code, 200)
        self.assertEqual(self.client.get("/api/v1/follows/following", headers=first_headers).json(), [])

    def test_password_runtime_probe_is_available_only_through_development_harness(self):
        from app.social.probe import install_social_probe

        install_social_probe(self.app)
        self.env.update({
            "APP_ENV": "development",
            "DB_PROBE_ENABLED": "true",
            "DB_PROBE_DEVELOPMENT_DATABASE": "true",
            "DB_PROBE_TOKEN": "password-probe-test-only",
        })
        response = self.client.get("/api/internal/password-runtime", headers={
            "Authorization": "Bearer password-probe-test-only",
        })
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), {
            "bcrypt": "PASS", "legacy_hash_verification": "PASS", "hash_generation": "PASS",
        })

    def test_failed_write_rolls_back_releases_lock_and_sanitizes_error(self):
        def fail_after_insert(db, user, tmdb_movie_id, comment_text):
            db.execute(text("""
                INSERT INTO comments (user_id, tmdb_movie_id, text, created_at)
                VALUES (1, 550, 'must roll back', '2020-01-01 00:00:00')
            """))
            raise SQLAlchemyError("private-database-url-and-password")

        with patch.object(store, "create_comment", side_effect=fail_after_insert):
            response = self.client.post("/api/v1/movies/550/comments", json={"text": "failure"}, headers=self.headers)
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("private-database", response.text)
        self.assertEqual(self.client.get("/api/v1/movies/550/comments").json(), [])
        self.assertFalse(self.app.state.social_db_lock.locked())

    def test_session_dependency_serializes_complete_operations(self):
        async def verify_serialization():
            active = 0
            maximum_active = 0

            async def use_session():
                nonlocal active, maximum_active
                request = Request({"type": "http", "app": self.app, "env": self.env})
                dependency = routes.get_social_session(request)
                try:
                    session = await anext(dependency)
                    active += 1
                    maximum_active = max(active, maximum_active)
                    session.execute(text("SELECT 1"))
                    await asyncio.sleep(0)
                    active -= 1
                finally:
                    await dependency.aclose()

            await asyncio.gather(use_session(), use_session())
            self.assertEqual(maximum_active, 1)
            self.assertFalse(self.app.state.social_db_lock.locked())

        asyncio.run(verify_serialization())

    def test_candidate_imports_no_legacy_catalogue_auth_or_password_graph(self):
        result = isolated("""
import builtins
import sys
original_import = builtins.__import__
def guarded_import(name, *args, **kwargs):
    if name.startswith(('app.models', 'app.core.config', 'app.deps.auth', 'app.api.v1', 'passlib', 'psycopg2')):
        raise AssertionError('Forbidden legacy import: ' + name)
    return original_import(name, *args, **kwargs)
builtins.__import__ = guarded_import
from app.application import create_app
from fastapi.testclient import TestClient
with TestClient(create_app(include_legacy_api=False, include_social_api=True)) as client:
    assert client.get('/api/health').status_code == 200
    assert client.post('/api/v1/movies/550/like').status_code == 401
    assert client.get('/api/v1/follows/following').status_code == 404
    assert client.get('/api/internal/db-health').status_code == 404
    assert '/api/v1/users/login' not in client.app.openapi()['paths']
account_app = create_app(include_legacy_api=False, include_social_api=True, include_account_api=True)
assert '/api/v1/users/login' in account_app.openapi()['paths']
assert not any(name.startswith('app.models') for name in sys.modules)
""")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_isolated_fixture_harness_verifies_transactions_and_cleans_only_its_user(self):
        from app.social.probe import install_social_probe

        install_social_probe(self.app)
        self.env.update({"APP_ENV": "development", "DB_PROBE_ENABLED": "true",
                         "DB_PROBE_DEVELOPMENT_DATABASE": "true", "DB_PROBE_TOKEN": "fixture-admin-test-only"})
        fixture_id = str(uuid4())
        payload = {"fixture_id": fixture_id,
                   "password_hash": "$2a$10$WvvTPHKwdBJ3uk0Z37EMR.hLA2W6N9AEBhEgrAOljy2Ae5MtaSIUi"}
        self.assertEqual(self.client.post("/api/internal/social-fixture", json=payload).status_code, 401)
        admin_headers = {"Authorization": "Bearer fixture-admin-test-only"}
        self.env["APP_ENV"] = "production"
        self.assertEqual(self.client.post("/api/internal/social-fixture", json=payload, headers=admin_headers).status_code, 404)
        self.env["APP_ENV"] = "development"
        self.assertEqual(self.client.post("/api/internal/social-fixture", json=payload, headers=admin_headers).status_code, 503)
        with self.engine.begin() as connection:
            self.assertEqual(connection.scalar(text("SELECT count(*) FROM users")), 2)
            connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)"))
            connection.execute(text("INSERT INTO alembic_version VALUES ('20261008_00')"))
        fixture = self.client.post("/api/internal/social-fixture", json=payload, headers=admin_headers)
        self.assertEqual(fixture.status_code, 200, fixture.text)
        self.assertTrue(all(value == "PASS" for value in fixture.json()["runtime"].values()))
        headers = {"Authorization": f"Bearer {token(fixture.json()['email'])}"}
        self.assertEqual(self.client.post("/api/v1/movies/550/comments", json={"text": "fixture-owned"}, headers=headers).status_code, 200)
        self.assertEqual(self.client.post("/api/v1/movies/550/like", headers=headers).status_code, 200)
        cleanup = self.client.delete(f"/api/internal/social-fixture/{fixture_id}", headers=admin_headers)
        self.assertEqual(cleanup.status_code, 200, cleanup.text)
        self.assertEqual(cleanup.json()["after"], fixture.json()["baseline"])
        self.assertEqual(cleanup.json()["delete"], "PASS")
        self.assertEqual(self.client.get("/api/v1/movies/likes", headers=self.headers).json(), [])
        self.assertEqual(self.client.get("/api/v1/movies/550/comments").json(), [])


if __name__ == "__main__":
    unittest.main()
