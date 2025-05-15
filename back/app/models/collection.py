from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.db.database import Base


class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True)
    tmdb_id = Column(Integer, unique=True, nullable=False)
    name = Column(String, nullable=False)
    poster_url = Column(String, nullable=True)
    backdrop_url = Column(String, nullable=True)

    movies = relationship("Movie", back_populates="collection")