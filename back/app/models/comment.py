from datetime import datetime

from sqlalchemy import CheckConstraint, Column, Integer, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship

from app.db.database import Base


class Comment(Base):
    __tablename__ = "comments"
    __table_args__ = (CheckConstraint("tmdb_movie_id > 0", name="ck_comments_tmdb_movie_id_positive"),)

    id = Column(Integer, primary_key=True, index=True)
    movie_id = Column(Integer, nullable=True)
    tmdb_movie_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="comments")
