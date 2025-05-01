from app.db.database import Base, engine

from app.models.comment import Comment
from app.models.genre import Genre
from app.models.like import Like
from app.models.movie import Movie
from app.models.movie_person import MoviePerson
from app.models.person import Person
from app.models.user import User


Base.metadata.create_all(bind=engine)