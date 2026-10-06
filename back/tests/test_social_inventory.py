"""Read-only inspector tests. Fixtures are not a real Neon migration."""

from contextlib import redirect_stdout
import io
import json
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine, event, text

from resources.social_inventory import analyze_rows, inspect_database, main


class SocialInventoryTests(unittest.TestCase):
    def test_both_like_sources_collisions_provenance_and_orphans(self):
        sources = {
            "user_likes": [{"user_id": 1, "movie_id": 7}, {"user_id": 1, "movie_id": 8}],
            "likes": [{"id": 91, "user_id": 1, "movie_id": 7},
                      {"id": 92, "user_id": None, "movie_id": 7},
                      {"id": 93, "user_id": 1, "movie_id": 99},
                      {"id": 94, "user_id": 1, "movie_id": 9}],
        }
        report = analyze_rows({1}, {7: 348, 8: 348, 9: 0}, [], sources, None)
        self.assertEqual(report["like_sources"]["user_likes"]["mapped_valid_rows"], 2)
        self.assertEqual(report["like_sources"]["likes"]["rows"], 4)
        self.assertEqual(report["like_sources"]["likes"]["unmapped_or_invalid_rows"], 3)
        self.assertEqual(report["duplicate_collisions"], [{"user_id": 1, "tmdb_movie_id": 348, "raw_rows": 3}])
        self.assertEqual(report["like_source_overlap"], [{"user_id": 1, "tmdb_movie_id": 348}])
        self.assertEqual(len(report["like_provenance"]), 3)
        self.assertEqual(report["like_provenance"][-1]["source_id"], 91)
        self.assertTrue(report["cutover_mapping_blocked"])

    def test_comment_mapping_is_external_id_and_issues_only_identifiers(self):
        comments = [{"id": 20, "user_id": 2, "movie_id": 7},
                    {"id": 21, "user_id": 2, "movie_id": 8},
                    {"id": 22, "user_id": 99, "movie_id": 7},
                    {"id": 23, "user_id": 2, "movie_id": 999}]
        report = analyze_rows({2}, {7: 348, 8: None}, comments, {}, None)
        self.assertEqual(report["comments"]["original_rows"], 4)
        self.assertEqual(report["comments"]["mapped_movie_rows"], 2)
        self.assertEqual(report["comments"]["unmapped_movie_rows"], 2)
        self.assertEqual([row["comment_id"] for row in report["comments"]["issues"]], [21, 22, 23])
        report = analyze_rows({2}, {7: 348}, [{"id": 20, "user_id": 2, "movie_id": 7, "tmdb_movie_id": 7}], {}, None)
        self.assertEqual(report["comments"]["issues"][0]["reasons"], ["existing_tmdb_field_mismatch"])

    def test_expected_target_comparison_both_directions_not_counts_only(self):
        sources = {"user_likes": [{"user_id": 2, "movie_id": 7}]}
        wrong = analyze_rows({2}, {7: 348}, [], sources, [{"user_id": 2, "tmdb_movie_id": 7}])["target_comparison"]
        self.assertEqual(wrong["distinct_target_pairs"], 1)
        self.assertEqual(wrong["expected_except_target"], [{"user_id": 2, "tmdb_movie_id": 348}])
        self.assertEqual(wrong["target_except_expected"], [{"user_id": 2, "tmdb_movie_id": 7}])
        correct = analyze_rows({2}, {7: 348}, [], sources, [{"user_id": 2, "tmdb_movie_id": 348}])["target_comparison"]
        self.assertEqual(correct["expected_except_target"], [])
        self.assertEqual(correct["target_except_expected"], [])

    def test_live_sqlite_reflection_is_read_only_and_excludes_private_values(self):
        engine = create_engine("sqlite://")
        try:
            with engine.begin() as connection:
                for statement in (
                    "CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)",
                    "CREATE TABLE movies (id INTEGER PRIMARY KEY, tmdb_id INTEGER UNIQUE)",
                    "CREATE TABLE comments (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id), movie_id INTEGER NOT NULL REFERENCES movies(id), text TEXT, created_at TEXT)",
                    "CREATE TABLE user_likes (user_id INTEGER REFERENCES users(id), movie_id INTEGER REFERENCES movies(id), PRIMARY KEY(user_id,movie_id))",
                    "CREATE TABLE likes (id INTEGER PRIMARY KEY, user_id INTEGER, movie_id INTEGER)",
                    "CREATE INDEX comments_movie_idx ON comments(movie_id)",
                    "INSERT INTO users VALUES (1,'private-username','private-password')",
                    "INSERT INTO movies VALUES (7,348)",
                    "INSERT INTO comments VALUES (20,1,7,'private-comment','2000-01-01')",
                    "INSERT INTO user_likes VALUES (1,7)",
                    "INSERT INTO likes VALUES (91,1,7)",
                ):
                    connection.execute(text(statement))
            statements = []
            event.listen(engine, "before_cursor_execute", lambda conn, cursor, sql, parameters, context, many: statements.append(sql))
            with engine.connect() as connection:
                report = inspect_database(connection, schema=None)
            self.assertTrue(report["likes_exists"])
            self.assertEqual(report["likes_row_count"], 1)
            self.assertEqual(report["tables"]["comments"]["rows"], 1)
            self.assertEqual(len(report["tables"]["comments"]["foreign_keys"]), 2)
            self.assertEqual(report["tables"]["comments"]["indexes"][0]["name"], "comments_movie_idx")
            self.assertFalse(report["social_integrity"]["cutover_mapping_blocked"])
            self.assertEqual(report["social_integrity"]["distinct_expected_like_pairs"], [{"user_id": 1, "tmdb_movie_id": 348}])
            self.assertNotIn("private-", json.dumps(report))
            for sql in statements:
                self.assertIn(sql.strip().split()[0].upper(), {"SELECT", "PRAGMA"}, sql)
        finally:
            engine.dispose()

    def test_missing_tables_are_recorded_not_assumed_empty(self):
        engine = create_engine("sqlite://")
        try:
            with engine.connect() as connection:
                report = inspect_database(connection, schema=None)
            self.assertFalse(report["likes_exists"])
            self.assertIsNone(report["likes_row_count"])
            self.assertIn("comments", report["schema_blockers"])
            self.assertNotIn("social_integrity", report)
        finally:
            engine.dispose()

    def test_cli_missing_config_and_local_url_refuse_before_connect(self):
        for raw in ("", "postgresql://private-user:private-password@localhost/db?sslmode=require"):
            with self.subTest(raw=bool(raw)), patch.dict("os.environ", {"SOCIAL_MIGRATION_DATABASE_URL": raw}), patch("sys.argv", ["social_inventory", "--development-database"]), patch("resources.social_inventory.engine_scope", side_effect=AssertionError("Must not connect")):
                output = io.StringIO()
                with redirect_stdout(output):
                    self.assertEqual(main(), 1)
                self.assertNotIn("private-", output.getvalue())


if __name__ == "__main__":
    unittest.main()
