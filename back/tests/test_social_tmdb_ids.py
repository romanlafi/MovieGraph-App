import unittest
from datetime import datetime
import importlib.util
import os
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

BACK = Path(__file__).resolve().parents[1]
if str(BACK) not in sys.path:
    sys.path.insert(0, str(BACK))
os.environ.setdefault("SECRET_KEY", "social-tests-only")
os.environ.setdefault("TMDB_API_KEY", "social-tests-only")

from app.api.v1.comments import router as comments_router
from app.api.v1.movie_likes import router as likes_router
from app.db.database import Base, get_db
from app.deps.auth import get_current_user
from app.models.collection import Collection
from app.models.comment import Comment
from app.models.genre import Genre
from app.models.movie import Movie
from app.models.movie_person import MoviePerson
from app.models.person import Person
from app.models.user import User
from app.models.user_movie_like import UserMovieLike
from app.schemas.comment import CommentCreate
from app.services.postgres.comment_service import list_movie_comments
from app.services.postgres.like_service import is_movie_liked, list_user_likes
from app.services.social_migration_integrity import (
    expected_tmdb_like_pairs,
    invalid_legacy_like_rows,
    unmapped_comment_rows,
)
from resources.social_migration_audit import inspect_database, require_development_target
from resources.initialize_neon_dev import request_development_url
from app.services.postgres.comment_service import create_comment
from app.services.postgres.like_service import like_movie, unlike_movie

social_migration_path = BACK / "migrations" / "versions" / "20261006_01_social_tmdb_ids.py"
social_migration_spec = importlib.util.spec_from_file_location("social_tmdb_migration", social_migration_path)
social_migration = importlib.util.module_from_spec(social_migration_spec)
social_migration_spec.loader.exec_module(social_migration)


class SocialTmdbIdTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine, autoflush=False)
        with self.SessionLocal() as session:
            session.add(User(id=1, email="fixture@example.test", username="fixture", password="hash"))
            session.commit()

        app = FastAPI()
        app.include_router(comments_router, prefix="/api/v1")
        app.include_router(likes_router, prefix="/api/v1")

        def db_override():
            with self.SessionLocal() as session:
                yield session

        app.dependency_overrides[get_db] = db_override
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1, email="fixture@example.test")
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_unseen_tmdb_movie_supports_comment_and_like_without_catalogue_writes(self):
        tmdb_movie_id = 900001
        response = self.client.post(
            f"/api/v1/movies/{tmdb_movie_id}/comments",
            json={"text": "A fixture comment"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["username"], "fixture")

        comments = self.client.get(f"/api/v1/movies/{tmdb_movie_id}/comments")
        self.assertEqual([row["text"] for row in comments.json()], ["A fixture comment"])
        self.assertEqual(comments.json()[0]["username"], "fixture")

        self.assertEqual(self.client.post(f"/api/v1/movies/{tmdb_movie_id}/like").status_code, 200)
        self.assertEqual(self.client.post(f"/api/v1/movies/{tmdb_movie_id}/like").status_code, 200)
        self.assertTrue(self.client.get(f"/api/v1/movies/{tmdb_movie_id}/like").json()["liked"])
        self.assertEqual(self.client.get("/api/v1/movies/likes").json(), [tmdb_movie_id])
        self.assertEqual(
            [column.name for column in UserMovieLike.__table__.primary_key.columns],
            ["user_id", "tmdb_movie_id"],
        )
        self.assertEqual(self.client.delete(f"/api/v1/movies/{tmdb_movie_id}/like").status_code, 200)
        self.assertEqual(self.client.delete(f"/api/v1/movies/{tmdb_movie_id}/like").status_code, 200)
        self.assertFalse(self.client.get(f"/api/v1/movies/{tmdb_movie_id}/like").json()["liked"])

        with self.SessionLocal() as session:
            self.assertEqual(session.query(Comment).count(), 1)
            saved_comment = session.query(Comment).one()
            self.assertEqual(saved_comment.tmdb_movie_id, tmdb_movie_id)
            self.assertIsNone(saved_comment.movie_id)
            self.assertEqual(session.query(UserMovieLike).count(), 0)
            self.assertEqual(session.query(Movie).count(), 0)
            self.assertEqual(session.query(Person).count(), 0)
            self.assertEqual(session.query(Genre).count(), 0)
            self.assertEqual(session.query(Collection).count(), 0)
            self.assertEqual(session.query(MoviePerson).count(), 0)

    def test_social_routes_reject_nonpositive_tmdb_ids(self):
        self.assertEqual(self.client.get("/api/v1/movies/0/comments").status_code, 422)
        self.assertEqual(self.client.post(
            "/api/v1/movies/0/comments",
            json={"text": "invalid id"},
        ).status_code, 422)
        self.assertEqual(self.client.post("/api/v1/movies/0/like").status_code, 422)

    def test_mapped_historical_comment_and_like_stay_on_legacy_tmdb_identity(self):
        with self.SessionLocal() as session:
            session.add(Movie(id=71, tmdb_id=550, title="fixture movie"))
            session.flush()
            session.add(Comment(
                id=11,
                user_id=1,
                movie_id=71,
                tmdb_movie_id=550,
                text="preserved fixture",
                created_at=datetime(2020, 1, 2, 3, 4, 5),
            ))
            session.add(UserMovieLike(user_id=1, tmdb_movie_id=550))
            session.commit()

            comments = list_movie_comments(session, 550)
            self.assertEqual([(row.comment_id, row.username, row.text) for row in comments], [
                (11, "fixture", "preserved fixture"),
            ])
            self.assertEqual(list_movie_comments(session, 551), [])
            self.assertTrue(is_movie_liked(session, 1, 550))
            self.assertFalse(is_movie_liked(session, 1, 551))
            self.assertEqual(list_user_likes(session, 1), [550])

    def test_migration_mapping_fixture_rejects_unmapped_and_deduplicates_overlap(self):
        comment_rows = [
            {"id": 1, "mapped_movie_id": 71, "tmdb_id": 550},
            {"id": 2, "mapped_movie_id": 72, "tmdb_id": 680},
        ]
        self.assertEqual(unmapped_comment_rows(comment_rows), [])
        self.assertEqual(unmapped_comment_rows([
            {"id": 3, "mapped_movie_id": None, "tmdb_id": None},
        ])[0]["id"], 3)

        like_rows = [
            {"source": "user_likes", "user_id": 1, "tmdb_movie_id": 550, "movie_id": 71, "valid_user": True},
            {"source": "likes", "user_id": 1, "tmdb_movie_id": 550, "movie_id": 71, "valid_user": True},
            {"source": "likes", "user_id": 2, "tmdb_movie_id": 680, "movie_id": 72, "valid_user": True},
        ]
        self.assertEqual(invalid_legacy_like_rows(like_rows), [])
        self.assertEqual(expected_tmdb_like_pairs(like_rows), {(1, 550), (2, 680)})
        self.assertEqual(invalid_legacy_like_rows([{
            "source": "likes", "user_id": 4, "tmdb_movie_id": None, "movie_id": 90, "valid_user": False,
        }])[0]["user_id"], 4)

    def test_database_audit_requires_explicit_neon_development_configuration(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "SOCIAL_AUDIT_DATABASE_URL"):
                require_development_target()

        with patch.dict(os.environ, {
            "SOCIAL_AUDIT_DATABASE_URL": "postgresql://user:password@localhost/db?sslmode=require",
            "SOCIAL_AUDIT_TARGET": "neon-development",
        }, clear=True):
            with self.assertRaisesRegex(RuntimeError, "Neon endpoint"):
                require_development_target()

    def test_initializer_requires_dev_confirmation_and_direct_moviegraph_url(self):
        valid_url = "postgresql://owner:secret@ep-dev.neon.tech/moviegraph?sslmode=require"
        with patch("builtins.input", return_value="DEV"), patch("getpass.getpass", return_value=valid_url):
            self.assertEqual(request_development_url(), valid_url)

        production_db_url = "postgresql://owner:secret@ep-dev.neon.tech/neondb?sslmode=require"
        with patch("builtins.input", return_value="DEV"), patch("getpass.getpass", return_value=production_db_url):
            with self.assertRaisesRegex(RuntimeError, "moviegraph database"):
                request_development_url()

        with patch("builtins.input", return_value="production") as confirmation, patch("getpass.getpass") as hidden_input:
            with self.assertRaisesRegex(RuntimeError, "confirmation failed"):
                request_development_url()
            hidden_input.assert_not_called()
            confirmation.assert_called_once()

    def test_empty_database_migration_bootstraps_only_social_tables(self):
        engine = create_engine("sqlite+pysqlite:///:memory:")
        try:
            with engine.begin() as connection:
                migration_context = MigrationContext.configure(connection)
                operations = Operations(migration_context)
                with patch.object(social_migration, "op", operations):
                    social_migration.upgrade()

                inspector = inspect(connection)
                self.assertEqual(set(inspector.get_table_names()), {
                    "users", "comments", "user_movie_likes",
                })
                self.assertEqual(
                    {foreign_key["referred_table"] for foreign_key in inspector.get_foreign_keys("comments")},
                    {"users"},
                )
                comment_columns = {column["name"]: column for column in inspector.get_columns("comments")}
                self.assertFalse(comment_columns["tmdb_movie_id"]["nullable"])
                self.assertTrue(comment_columns["movie_id"]["nullable"])
                self.assertNotIn("movies", inspector.get_table_names())

                SessionLocal = sessionmaker(bind=connection, autoflush=False)
                with SessionLocal() as session:
                    session.add(User(email="fresh@example.test", username="fresh", password="hash"))
                    session.commit()
                    saved_comment = create_comment(
                        session,
                        "fresh@example.test",
                        900002,
                        CommentCreate(text="fresh install"),
                    )
                    self.assertEqual(saved_comment.username, "fresh")
                    self.assertEqual(list_movie_comments(session, 900002)[0].text, "fresh install")
                    like_movie(session, 1, 900002)
                    self.assertTrue(is_movie_liked(session, 1, 900002))
                    self.assertEqual(list_user_likes(session, 1), [900002])
                    unlike_movie(session, 1, 900002)
                    self.assertFalse(is_movie_liked(session, 1, 900002))

                baseline = inspect_database(connection)
                self.assertEqual(baseline["tables"]["comments"]["row_count"], 1)
                self.assertEqual(baseline["social"]["comments"]["storage_mode"], "tmdb_id")
                self.assertEqual(baseline["social"]["target_user_movie_likes"]["exists"], True)
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
