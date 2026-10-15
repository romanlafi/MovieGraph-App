from sqlalchemy import Column, Integer, ForeignKey, String
from sqlalchemy.orm import relationship

from migrations.legacy_models.base import LegacyBase


class MoviePerson(LegacyBase):
    __tablename__ = "movie_persons"

    id = Column(Integer, primary_key=True, index=True)
    movie_id = Column(Integer, ForeignKey("movies.id"))
    person_id = Column(Integer, ForeignKey("persons.id"))
    role = Column(String)
    character = Column(String)

    movie = relationship("Movie", back_populates="movie_persons")
    person = relationship("Person", back_populates="movie_roles")
