from app.db.database import Base, engine_scope
from app.db.runtime import DatabaseConfig
import os

from app.models.collection import Collection
from app.models.comment import Comment
from app.models.genre import Genre
from app.models.like import Like
from app.models.movie import Movie
from app.models.movie_person import MoviePerson
from app.models.person import Person
from app.models.user import User


def main():
    # Retained for legacy local Docker only; never a production migration.
    if os.getenv("APP_ENV", "development") != "development":
        raise RuntimeError("Legacy create_tables is restricted to local development")
    with engine_scope(DatabaseConfig.local()) as engine:
        Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    main()
