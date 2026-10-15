from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship

from migrations.legacy_models.base import LegacyBase

movie_genres = Table(
    "movie_genres", LegacyBase.metadata,
    Column("movie_id", ForeignKey("movies.id"), primary_key=True),
    Column("genre_id", ForeignKey("genres.id"), primary_key=True)
)

user_genres = Table(
    "user_genres", LegacyBase.metadata,
    Column("user_id", ForeignKey("users.id"), primary_key=True),
    Column("genre_id", ForeignKey("genres.id"), primary_key=True)
)

class Genre(LegacyBase):
    __tablename__ = "genres"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)

    movies = relationship("Movie", secondary=movie_genres, back_populates="genres")
    users = relationship("User", secondary=user_genres, back_populates="favorite_genres")
