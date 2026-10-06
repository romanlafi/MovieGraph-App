from sqlalchemy import Column, Integer, String, Table

from app.db.database import Base


user_movie_like_sources = Table(
    "user_movie_like_sources",
    Base.metadata,
    Column("id", Integer, primary_key=True),
    Column("legacy_source", String(80), nullable=False),
    Column("legacy_id", Integer, nullable=True),
    Column("legacy_user_id", Integer, nullable=False),
    Column("legacy_movie_id", Integer, nullable=False),
    Column("tmdb_movie_id", Integer, nullable=False),
)
