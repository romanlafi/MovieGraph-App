from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base


class Movie(Base):
    __tablename__ = "movies"

    id = Column(Integer, primary_key=True, index=True)
    tmdb_id = Column(Integer, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    year = Column(Integer)
    poster_url = Column(String)
    released = Column(String)
    runtime = Column(String)
    box_office = Column(String)
    website = Column(String)
    plot = Column(Text)
    rating = Column(Float)
    trailer_url = Column(String)
    tagline = Column(String, nullable=True)
    backdrop_url = Column(String, nullable=True)
    origin_country = Column(String, nullable=True)
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=True)

    genres = relationship("Genre", secondary="movie_genres", back_populates="movies")
    movie_persons = relationship("MoviePerson", back_populates="movie")
    comments = relationship("Comment", back_populates="movie", cascade="all, delete-orphan")
    liked_by = relationship("User", secondary="user_likes", back_populates="likes")
    collection = relationship("Collection", back_populates="movies")

