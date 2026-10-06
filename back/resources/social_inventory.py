"""Trusted, read-only Neon development inventory; no models or migrations."""

import argparse
from collections import Counter
import json
import os

from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.db.database import engine_scope
from app.db.runtime import DatabaseConfig, DatabaseConfigurationError


def positive_id(value) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def pair_rows(pairs: set[tuple]) -> list[dict]:
    return [{"user_id": user_id, "tmdb_movie_id": tmdb_id}
            for user_id, tmdb_id in sorted(pairs, key=lambda pair: tuple(map(str, pair)))]


def analyze_rows(users: set, movies: dict, comments: list[dict],
                 sources: dict[str, list[dict]], target: list[dict] | None) -> dict:
    """Classify identifiers only; never accept comment text/user credentials."""
    comment_issues = []
    mapped_comments = 0
    for row in comments:
        tmdb_id = movies.get(row["movie_id"])
        reasons = []
        if row["movie_id"] not in movies:
            reasons.append("orphan_movie")
        elif not positive_id(tmdb_id):
            reasons.append("invalid_tmdb_id")
        else:
            mapped_comments += 1
        if row["user_id"] not in users:
            reasons.append("orphan_user")
        if "tmdb_movie_id" in row and row["tmdb_movie_id"] != tmdb_id:
            reasons.append("existing_tmdb_field_mismatch")
        if reasons:
            comment_issues.append({"comment_id": row["id"], "user_id": row["user_id"],
                                   "movie_id": row["movie_id"], "reasons": reasons})

    provenance = []
    source_report = {}
    source_pairs = {}
    collisions = Counter()
    for source, rows in sources.items():
        invalid = []
        pairs = set()
        valid_count = 0
        for row in rows:
            tmdb_id = movies.get(row["movie_id"])
            identifiers = {"source": source, "source_id": row.get("id"),
                           "user_id": row["user_id"], "movie_id": row["movie_id"]}
            reasons = []
            if row["user_id"] not in users:
                reasons.append("orphan_user")
            if row["movie_id"] not in movies:
                reasons.append("orphan_movie")
            elif not positive_id(tmdb_id):
                reasons.append("invalid_tmdb_id")
            if reasons:
                invalid.append({**identifiers, "reasons": reasons})
                continue
            valid_count += 1
            pair = (row["user_id"], tmdb_id)
            pairs.add(pair)
            collisions[pair] += 1
            provenance.append({**identifiers, "tmdb_movie_id": tmdb_id})
        source_pairs[source] = pairs
        source_report[source] = {"rows": len(rows), "mapped_valid_rows": valid_count,
                                 "unmapped_or_invalid_rows": len(invalid),
                                 "distinct_expected_pairs": len(pairs), "issues": invalid}

    expected = set().union(*source_pairs.values())
    overlap = source_pairs.get("likes", set()) & source_pairs.get("user_likes", set())
    result = {
        "comments": {"original_rows": len(comments), "mapped_movie_rows": mapped_comments,
                     "unmapped_movie_rows": len(comments) - mapped_comments, "issues": comment_issues},
        "like_sources": source_report,
        "like_source_overlap": pair_rows(overlap),
        "duplicate_collisions": [{**pair, "raw_rows": collisions[(pair["user_id"], pair["tmdb_movie_id"])]}
                                 for pair in pair_rows({pair for pair, count in collisions.items() if count > 1})],
        "like_provenance": provenance,
        "distinct_expected_like_pairs": pair_rows(expected),
        "cutover_mapping_blocked": bool(comment_issues or any(item["issues"] for item in source_report.values())),
    }
    if target is None:
        result["target_comparison"] = {"status": "target_not_present_or_not_inspectable"}
    else:
        actual = {(row["user_id"], row["tmdb_movie_id"]) for row in target}
        result["target_comparison"] = {
            "status": "compared", "raw_target_rows": len(target),
            "distinct_target_pairs": len(actual),
            "duplicate_target_rows": len(target) - len(actual),
            "expected_except_target": pair_rows(expected - actual),
            "target_except_expected": pair_rows(actual - expected),
            "invalid_target_pairs": pair_rows({pair for pair in actual
                                               if pair[0] not in users or not positive_id(pair[1])}),
        }
    return result


def inspect_database(connection, schema: str | None = "public") -> dict:
    inspector = inspect(connection)
    quote = connection.dialect.identifier_preparer.quote_identifier

    def qualified(table: str) -> str:
        return f"{quote(schema)}.{quote(table)}" if schema else quote(table)

    inventory = {}
    columns_by_table = {}
    for table in inspector.get_table_names(schema=schema):
        columns = inspector.get_columns(table, schema=schema)
        columns_by_table[table] = {column["name"] for column in columns}
        inventory[table] = {
            "rows": connection.execute(text(f"SELECT count(*) FROM {qualified(table)}")).scalar_one(),
            "columns": [{"name": column["name"], "type": str(column["type"]),
                         "nullable": column["nullable"]} for column in columns],
            "primary_key": inspector.get_pk_constraint(table, schema=schema),
            "foreign_keys": inspector.get_foreign_keys(table, schema=schema),
            "indexes": inspector.get_indexes(table, schema=schema),
            "unique_constraints": inspector.get_unique_constraints(table, schema=schema),
            "check_constraints": inspector.get_check_constraints(table, schema=schema),
        }

    required = {"users": {"id"}, "movies": {"id", "tmdb_id"},
                "comments": {"id", "user_id", "movie_id", "text", "created_at"}}
    for table in ("likes", "user_likes"):
        if table in inventory:
            required[table] = {"user_id", "movie_id"}
    missing = {table: sorted(names - columns_by_table.get(table, set()))
               for table, names in required.items() if names - columns_by_table.get(table, set())}
    report = {"verification": "read_only_database_inventory", "schema": schema,
              "tables": inventory, "likes_exists": "likes" in inventory,
              "likes_row_count": inventory.get("likes", {}).get("rows"),
              "schema_blockers": missing}
    if missing:
        return report

    def identifiers(table: str, columns: list[str]) -> list[dict]:
        sql = f"SELECT {', '.join(map(quote, columns))} FROM {qualified(table)}"
        return [dict(row) for row in connection.execute(text(sql)).mappings()]

    users = {row["id"] for row in identifiers("users", ["id"])}
    movies = {row["id"]: row["tmdb_id"] for row in identifiers("movies", ["id", "tmdb_id"])}
    comment_columns = ["id", "user_id", "movie_id"]
    if "tmdb_movie_id" in columns_by_table["comments"]:
        comment_columns.append("tmdb_movie_id")
    sources = {}
    for table in ("user_likes", "likes"):
        if table in inventory:
            names = ["user_id", "movie_id"]
            if "id" in columns_by_table[table]:
                names.insert(0, "id")
            sources[table] = identifiers(table, names)
    target = None
    if {"user_id", "tmdb_movie_id"} <= columns_by_table.get("user_movie_likes", set()):
        target = identifiers("user_movie_likes", ["user_id", "tmdb_movie_id"])
    report["social_integrity"] = analyze_rows(users, movies, identifiers("comments", comment_columns), sources, target)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--development-database", required=True, action="store_true")
    parser.add_argument("--schema", default="public")
    args = parser.parse_args()
    try:
        raw = os.getenv("SOCIAL_MIGRATION_DATABASE_URL", "")
        if not raw:
            raise DatabaseConfigurationError("Set SOCIAL_MIGRATION_DATABASE_URL to the confirmed Neon development branch")
        config = DatabaseConfig.local(raw)
        if not config.url.host.endswith(".neon.tech"):
            raise DatabaseConfigurationError("Inventory requires a direct Neon development URL; no legacy local fallback")
        if config.url.drivername not in {"postgresql", "postgresql+psycopg2"} or config.url.query.get("sslmode") not in {"require", "verify-ca", "verify-full"}:
            raise DatabaseConfigurationError("Use a PostgreSQL/psycopg2 URL with sslmode=require or certificate verification")
        with engine_scope(config) as engine, engine.connect() as connection, connection.begin():
            connection.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
            connection.execute(text("SET LOCAL statement_timeout = '10s'"))
            report = inspect_database(connection, args.schema)
        print(json.dumps(report, indent=2, default=str))
    except DatabaseConfigurationError as exc:
        print(str(exc))
        return 1
    except SQLAlchemyError:
        print("Read-only inventory failed; check development access/schema without logging connection details")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
