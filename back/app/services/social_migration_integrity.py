from collections.abc import Iterable, Mapping


def unmapped_comment_rows(rows: Iterable[Mapping]) -> list[Mapping]:
    return [
        row for row in rows
        if row["mapped_movie_id"] is None
        or ("mapped_user_id" in row and row["mapped_user_id"] is None)
        or row["tmdb_id"] is None
        or row["tmdb_id"] <= 0
    ]


def invalid_legacy_like_rows(rows: Iterable[Mapping]) -> list[Mapping]:
    return [
        row for row in rows
        if not row["valid_user"]
        or row["movie_id"] is None
        or row["tmdb_movie_id"] is None
        or row["tmdb_movie_id"] <= 0
    ]


def expected_tmdb_like_pairs(rows: Iterable[Mapping]) -> set[tuple[int, int]]:
    rows = list(rows)
    invalid = invalid_legacy_like_rows(rows)
    if invalid:
        raise ValueError(f"Cannot map {len(invalid)} legacy like row(s)")
    return {(row["user_id"], row["tmdb_movie_id"]) for row in rows}
