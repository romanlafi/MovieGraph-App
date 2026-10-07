"""Columns used by social queries; schema changes belong to Alembic."""

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, MetaData, String, Table, Text


metadata = MetaData()

users = Table(
    "users", metadata,
    Column("id", Integer, primary_key=True),
    Column("email", String),
    Column("username", String),
    Column("password", String),
    Column("birthdate", Date),
    Column("bio", String),
)

user_genre_preferences = Table(
    "user_genre_preferences", metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("genre_name", String, primary_key=True),
)

user_follows = Table(
    "user_follows", metadata,
    Column("follower_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("followed_id", Integer, ForeignKey("users.id"), primary_key=True),
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
