from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.database import Base


class Person(Base):
    __tablename__ = "persons"

    id = Column(Integer, primary_key=True, index=True)
    tmdb_id = Column(Integer, unique=True, index=True)
    name = Column(String, nullable=False)
    photo_url = Column(String)
    biography = Column(Text)
    birthday = Column(String)
    place_of_birth = Column(String)

    movie_roles = relationship("MoviePerson", back_populates="person")