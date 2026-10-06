from sqlalchemy import CheckConstraint, Column, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.db.database import Base


class UserMovieLike(Base):
    __tablename__ = "user_movie_likes"
    __table_args__ = (
        CheckConstraint("tmdb_movie_id > 0", name="ck_user_movie_likes_tmdb_movie_id_positive"),
    )

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    tmdb_movie_id = Column(Integer, primary_key=True)

    user = relationship("User", back_populates="movie_likes")
