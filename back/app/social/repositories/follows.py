"""Follow relationships and liked TMDB IDs, independent of HTTP."""

from typing import Literal

from sqlalchemy import delete, insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.schemas.auth import UserResponse
from app.social.repositories import accounts
from app.social.tables import user_follows, user_movie_likes, users


FollowResult = Literal["already_following", "followed", "unfollowed"]


def follow_user(db: Session, follower_id: int, followed_email: str) -> FollowResult | None:
    followed_id = db.scalar(select(users.c.id).where(users.c.email == followed_email))
    if followed_id is None:
        return None
    return _follow_user_id(db, follower_id, followed_id)


def follow_user_by_public_id(db: Session, follower_id: int, public_id: str) -> FollowResult | None:
    followed_id = db.scalar(select(users.c.id).where(users.c.public_id == public_id))
    if followed_id is None:
        return None
    return _follow_user_id(db, follower_id, followed_id)


def _follow_user_id(db: Session, follower_id: int, followed_id: int) -> FollowResult:
    if follower_id == followed_id or db.execute(select(user_follows.c.follower_id).where(
        user_follows.c.follower_id == follower_id,
        user_follows.c.followed_id == followed_id,
    )).first() is not None:
        return "already_following"
    try:
        with db.begin_nested():
            db.execute(insert(user_follows).values(follower_id=follower_id, followed_id=followed_id))
        db.commit()
    except IntegrityError:
        db.rollback()
        if db.execute(select(user_follows.c.follower_id).where(
            user_follows.c.follower_id == follower_id,
            user_follows.c.followed_id == followed_id,
        )).first() is None:
            raise
    return "followed"


def unfollow_user(db: Session, follower_id: int, followed_email: str) -> FollowResult | None:
    followed_id = db.scalar(select(users.c.id).where(users.c.email == followed_email))
    if followed_id is None:
        return None
    return _unfollow_user_id(db, follower_id, followed_id)


def unfollow_user_by_public_id(db: Session, follower_id: int, public_id: str) -> FollowResult | None:
    followed_id = db.scalar(select(users.c.id).where(users.c.public_id == public_id))
    if followed_id is None:
        return None
    return _unfollow_user_id(db, follower_id, followed_id)


def _unfollow_user_id(db: Session, follower_id: int, followed_id: int) -> FollowResult:
    db.execute(delete(user_follows).where(
        user_follows.c.follower_id == follower_id,
        user_follows.c.followed_id == followed_id,
    ))
    db.commit()
    return "unfollowed"


def list_following(db: Session, user_id: int) -> list[UserResponse]:
    user_ids = db.scalars(select(user_follows.c.followed_id).where(
        user_follows.c.follower_id == user_id,
    ).order_by(user_follows.c.followed_id)).all()
    return accounts.public_profiles(db, user_ids)


def list_followers(db: Session, user_id: int) -> list[UserResponse]:
    user_ids = db.scalars(select(user_follows.c.follower_id).where(
        user_follows.c.followed_id == user_id,
    ).order_by(user_follows.c.follower_id)).all()
    return accounts.public_profiles(db, user_ids)


def list_followed_user_like_ids(db: Session, user_id: int, limit: int = 100) -> list[int]:
    return list(db.scalars(select(user_movie_likes.c.tmdb_movie_id).select_from(
        user_follows.join(
            user_movie_likes,
            user_follows.c.followed_id == user_movie_likes.c.user_id,
        ),
    ).where(
        user_follows.c.follower_id == user_id,
    ).distinct().order_by(user_movie_likes.c.tmdb_movie_id).limit(limit)))
