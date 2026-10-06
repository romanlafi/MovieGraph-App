"""Columns used by social queries; schema changes belong to Alembic."""

from sqlalchemy import Column, DateTime, Integer, MetaData, String, Table, Text


metadata = MetaData()

users = Table(
    "users", metadata,
    Column("id", Integer, primary_key=True),
    Column("email", String),
    Column("username", String),
)

comments = Table(
    "comments", metadata,
    Column("id", Integer, primary_key=True),
    Column("user_id", Integer),
    Column("tmdb_movie_id", Integer),
    Column("text", Text),
    Column("created_at", DateTime),
)

user_movie_likes = Table(
    "user_movie_likes", metadata,
    Column("user_id", Integer, primary_key=True),
    Column("tmdb_movie_id", Integer, primary_key=True),
)
