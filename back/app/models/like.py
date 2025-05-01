from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint

from app.db.database import Base


class Like(Base):
    __tablename__ = "likes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    movie_id = Column(Integer, ForeignKey("movies.id"))

    __table_args__ = (UniqueConstraint("user_id", "movie_id", name="unique_user_movie_like"),)
