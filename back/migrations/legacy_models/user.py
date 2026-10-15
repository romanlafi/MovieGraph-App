from sqlalchemy import Column, Integer, String, Date, Table, ForeignKey
from sqlalchemy.orm import relationship

from migrations.legacy_models.base import LegacyBase
from migrations.legacy_models.genre import user_genres


user_follows = Table(
    "user_follows",
    LegacyBase.metadata,
    Column("follower_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("followed_id", Integer, ForeignKey("users.id"), primary_key=True),
)

user_likes = Table(
    "user_likes",
    LegacyBase.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("movie_id", Integer, ForeignKey("movies.id"), primary_key=True),
)

class User(LegacyBase):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, nullable=False)
    password = Column(String, nullable=False)
    birthdate = Column(Date)
    bio = Column(String)

    favorite_genres = relationship(
        "Genre",
        secondary=user_genres,
        back_populates="users")

    comments = relationship(
        "Comment",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    likes = relationship(
        "Movie",
        secondary="user_likes",
        back_populates="liked_by"
    )

    movie_likes = relationship("UserMovieLike", back_populates="user", cascade="all, delete-orphan")

    following = relationship(
        "User",
        secondary=user_follows,
        primaryjoin=id == user_follows.c.follower_id,
        secondaryjoin=id == user_follows.c.followed_id,
        backref="followers"
    )

