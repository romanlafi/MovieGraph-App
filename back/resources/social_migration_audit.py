"""Read-only inventory for the confirmed Neon development database."""

import argparse
import json
import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool


def require_development_target() -> str:
    url = os.environ.get("SOCIAL_AUDIT_DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError("Set SOCIAL_AUDIT_DATABASE_URL to the direct Neon development branch URL")
    if os.environ.get("SOCIAL_AUDIT_TARGET") != "neon-development":
        raise RuntimeError("Set SOCIAL_AUDIT_TARGET=neon-development after confirming the branch")
    parsed = make_url(url)
    if parsed.get_backend_name() != "postgresql":
        raise RuntimeError("The social migration audit accepts PostgreSQL only")
    if parsed.host is None or ".neon.tech" not in parsed.host:
        raise RuntimeError("The audit URL must target a Neon endpoint")
    if "-pooler." in parsed.host:
        raise RuntimeError("Use the direct, unpooled Neon development endpoint for this audit")
    ssl_mode = parsed.query.get("sslmode")
    if ssl_mode not in {"require", "verify-ca", "verify-full"}:
        raise RuntimeError("The audit URL must require TLS with sslmode=require or stronger")
    return url


def inspect_database(connection) -> dict:
    inspector = inspect(connection)
    schema = "public" if connection.dialect.name == "postgresql" else None
    schema_prefix = f"{schema}." if schema else ""
    table_names = inspector.get_table_names(schema=schema)
    report = {"schema": schema or inspector.default_schema_name, "tables": {}, "social": {}}

    for table_name in table_names:
        count = connection.execute(text(f' SELECT count(*) FROM {schema_prefix}"{table_name}"')).scalar_one()
        report["tables"][table_name] = {
            "row_count": count,
            "columns": inspector.get_columns(table_name, schema=schema),
            "foreign_keys": inspector.get_foreign_keys(table_name, schema=schema),
            "indexes": inspector.get_indexes(table_name, schema=schema),
            "unique_constraints": inspector.get_unique_constraints(table_name, schema=schema),
            "primary_key": inspector.get_pk_constraint(table_name, schema=schema),
            "check_constraints": inspector.get_check_constraints(table_name, schema=schema),
        }

    required = {
        "comments": {"id", "user_id", "movie_id", "text", "created_at"},
        "movies": {"id", "tmdb_id"},
        "users": {"id"},
    }
    existing_columns = {
        table: {column["name"] for column in details["columns"]}
        for table, details in report["tables"].items()
    }
    report["social"]["required_schema_columns_present"] = {
        table: sorted(columns & existing_columns.get(table, set()))
        for table, columns in required.items()
    }

    comment_columns = existing_columns.get("comments", set())
    if required["comments"].issubset(comment_columns) and required["movies"].issubset(existing_columns.get("movies", set())):
        result = connection.execute(text(
            "SELECT c.id, c.user_id, c.movie_id, u.id AS mapped_user_id, "
            "m.id AS mapped_movie_id, m.tmdb_id "
            f"FROM {schema_prefix}comments c LEFT JOIN {schema_prefix}users u ON u.id = c.user_id "
            f"LEFT JOIN {schema_prefix}movies m ON m.id = c.movie_id ORDER BY c.id"
        )).mappings().all()
        unmapped = [row for row in result if row["mapped_movie_id"] is None]
        orphaned_users = [row for row in result if row["mapped_user_id"] is None]
        invalid = [row for row in result if row["tmdb_id"] is None or row["tmdb_id"] <= 0]
        report["social"]["comments"] = {
            "total": len(result),
            "mapped": len(result) - len(unmapped),
            "unmapped_movie_reference_count": len(unmapped),
            "unmapped_movie_reference_ids": [row["id"] for row in unmapped],
            "invalid_tmdb_id_count": len(invalid),
            "invalid_tmdb_id_comment_ids": [row["id"] for row in invalid],
            "orphaned_movie_reference_count": len(unmapped),
            "orphaned_movie_reference_comment_ids": [row["id"] for row in unmapped],
            "orphaned_user_count": len(orphaned_users),
            "orphaned_user_comment_ids": [row["id"] for row in orphaned_users],
        }
    elif {"id", "user_id", "tmdb_movie_id", "text", "created_at"}.issubset(comment_columns):
        result = connection.execute(text(
            "SELECT c.id, c.user_id, c.tmdb_movie_id, c.movie_id, u.id AS mapped_user_id "
            f"FROM {schema_prefix}comments c LEFT JOIN {schema_prefix}users u ON u.id = c.user_id ORDER BY c.id"
        )).mappings().all()
        invalid_ids = [row for row in result if row["tmdb_movie_id"] is None or row["tmdb_movie_id"] <= 0]
        orphaned_users = [row for row in result if row["mapped_user_id"] is None]
        report["social"]["comments"] = {
            "storage_mode": "tmdb_id",
            "total": len(result),
            "mapped": len(result) - len(invalid_ids),
            "unmapped_or_invalid_tmdb_id_count": len(invalid_ids),
            "unmapped_comment_ids": [row["id"] for row in invalid_ids],
            "orphaned_user_count": len(orphaned_users),
            "orphaned_user_comment_ids": [row["id"] for row in orphaned_users],
            "legacy_local_movie_reference_count": sum(row["movie_id"] is not None for row in result),
        }

    like_sources = []
    for table_name in ("user_likes", "likes"):
        if table_name not in existing_columns:
            report["social"][table_name] = {"exists": False, "row_count": 0}
            continue
        columns = existing_columns[table_name]
        source_result = {"exists": True, "row_count": report["tables"][table_name]["row_count"]}
        if {"user_id", "movie_id"}.issubset(columns) and required["movies"].issubset(existing_columns.get("movies", set())):
            id_column = "l.id," if "id" in columns else ""
            rows = connection.execute(text(
                f"SELECT {id_column} l.user_id, l.movie_id, m.id AS mapped_movie_id, m.tmdb_id, "
                "(u.id IS NOT NULL) AS valid_user "
                f"FROM {schema_prefix}{table_name} l "
                f"LEFT JOIN {schema_prefix}movies m ON m.id = l.movie_id "
                f"LEFT JOIN {schema_prefix}users u ON u.id = l.user_id"
            )).mappings().all()
            invalid_user = [row for row in rows if not row["valid_user"]]
            orphaned_movie = [row for row in rows if row["mapped_movie_id"] is None]
            invalid_tmdb = [row for row in rows if row["tmdb_id"] is None or row["tmdb_id"] <= 0]
            valid_rows = [row for row in rows if row not in invalid_user and row not in orphaned_movie and row not in invalid_tmdb]
            source_result.update({
                "valid_rows": len(valid_rows),
                "orphan_user_count": len(invalid_user),
                "orphan_user_source_ids": [row.get("id", (row["user_id"], row["movie_id"])) for row in invalid_user],
                "orphan_movie_count": len(orphaned_movie),
                "orphan_movie_source_ids": [row.get("id", (row["user_id"], row["movie_id"])) for row in orphaned_movie],
                "invalid_tmdb_id_count": len(invalid_tmdb),
                "invalid_tmdb_source_ids": [row.get("id", (row["user_id"], row["movie_id"])) for row in invalid_tmdb],
            })
            like_sources.extend((table_name, row["user_id"], row["tmdb_id"]) for row in valid_rows)
        else:
            source_result["mapping_check"] = "skipped: actual columns differ from the audited legacy shape"
        report["social"][table_name] = source_result

    source_counts = {}
    for source, _, _ in like_sources:
        source_counts[source] = source_counts.get(source, 0) + 1
    source_pairs = {}
    for source, user_id, tmdb_id in like_sources:
        source_pairs.setdefault(source, set()).add((user_id, tmdb_id))
    all_pairs = {pair for _, user_id, tmdb_id in like_sources for pair in [(user_id, tmdb_id)]}
    mapped_raw_count = len(like_sources)
    per_source_unique_count = sum(len(value) for value in source_pairs.values())
    cross_source_overlaps = per_source_unique_count - len(all_pairs)
    report["social"]["likes_reconciliation"] = {
        "valid_mapped_raw_rows": source_counts,
        "distinct_pairs_by_source": {key: len(value) for key, value in source_pairs.items()},
        "distinct_union_pairs": len(all_pairs),
        "mapped_raw_rows_across_sources": mapped_raw_count,
        "duplicate_rows_within_sources": mapped_raw_count - per_source_unique_count,
        "overlap_collisions_across_sources": cross_source_overlaps,
        "total_raw_to_target_collisions": mapped_raw_count - len(all_pairs),
    }
    target_columns = existing_columns.get("user_movie_likes", set())
    if {"user_id", "tmdb_movie_id"}.issubset(target_columns):
        target_rows = connection.execute(text(
            "SELECT l.user_id, l.tmdb_movie_id, (u.id IS NOT NULL) AS valid_user "
            f"FROM {schema_prefix}user_movie_likes l LEFT JOIN {schema_prefix}users u ON u.id = l.user_id"
        )).mappings().all()
        target_pairs = {(row["user_id"], row["tmdb_movie_id"]) for row in target_rows}
        invalid_target = [row for row in target_rows if not row["valid_user"] or row["tmdb_movie_id"] is None or row["tmdb_movie_id"] <= 0]
        report["social"]["target_user_movie_likes"] = {
            "exists": True,
            "raw_row_count": len(target_rows),
            "distinct_pair_count": len(target_pairs),
            "duplicate_pair_count": len(target_rows) - len(target_pairs),
            "orphaned_user_or_invalid_tmdb_id_count": len(invalid_target),
            "comparison_status": "compared" if like_sources else "no_legacy_sources_clean_install",
        }
        if like_sources:
            report["social"]["target_user_movie_likes"].update({
                "expected_except_target": sorted(all_pairs - target_pairs),
                "target_except_expected": sorted(target_pairs - all_pairs),
            })
    else:
        report["social"]["target_user_movie_likes"] = {"exists": False, "raw_row_count": None}
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Read-only social schema/data inventory for Neon development")
    parser.add_argument("--development-database", action="store_true", required=True)
    parser.parse_args()
    url = require_development_target()
    engine = create_engine(url, poolclass=NullPool, hide_parameters=True)
    try:
        with engine.connect() as connection:
            current_database, current_schema = connection.execute(
                text("SELECT current_database(), current_schema()")
            ).one()
            print(json.dumps({
                "target": "neon-development",
                "database": current_database,
                "schema": current_schema,
                "inventory": inspect_database(connection),
            }, default=str, indent=2))
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
