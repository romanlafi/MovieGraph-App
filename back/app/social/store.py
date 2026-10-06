"""MovieGraph social queries shared by the local API and Worker."""

from dataclasses import dataclass
from datetime import datetime, UTC

from sqlalchemy import delete, insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .tables import comments, user_movie_likes, users


@dataclass(frozen=True)
class SocialUser:
    id: int
    email: str
    username: str


def get_user_by_email(db: Session, email: str) -> SocialUser | None:
    row = db.execute(select(users).where(users.c.email == email)).mappings().first()
    return SocialUser(**row) if row is not None else None


def create_comment(db: Session, user: SocialUser, tmdb_movie_id: int, text: str) -> dict:
    row = db.execute(
        insert(comments).values(
            user_id=user.id,
            tmdb_movie_id=tmdb_movie_id,
            text=text,
            created_at=datetime.now(UTC).replace(tzinfo=None),
        ).returning(comments.c.id, comments.c.text, comments.c.created_at)
    ).mappings().one()
    db.commit()
    return {
        "comment_id": row["id"],
        "username": user.username,
        "text": row["text"],
        "created_at": row["created_at"],
    }


def list_movie_comments(db: Session, tmdb_movie_id: int) -> list[dict]:
    statement = select(
        comments.c.id.label("comment_id"), users.c.username,
        comments.c.text, comments.c.created_at,
    ).select_from(comments.join(users, comments.c.user_id == users.c.id)).where(
        comments.c.tmdb_movie_id == tmdb_movie_id,
    ).order_by(comments.c.created_at.desc())
    return [dict(row) for row in db.execute(statement).mappings()]


def list_user_likes(db: Session, user_id: int) -> list[int]:
    return list(db.scalars(select(user_movie_likes.c.tmdb_movie_id).where(
        user_movie_likes.c.user_id == user_id,
    ).order_by(user_movie_likes.c.tmdb_movie_id)))


def is_movie_liked(db: Session, user_id: int, tmdb_movie_id: int) -> bool:
    return db.execute(select(user_movie_likes.c.user_id).where(
        user_movie_likes.c.user_id == user_id,
        user_movie_likes.c.tmdb_movie_id == tmdb_movie_id,
    )).first() is not None


def like_movie(db: Session, user_id: int, tmdb_movie_id: int) -> None:
    if is_movie_liked(db, user_id, tmdb_movie_id):
        return
    try:
        with db.begin_nested():
            db.execute(insert(user_movie_likes).values(
                user_id=user_id, tmdb_movie_id=tmdb_movie_id,
            ))
        db.commit()
    except IntegrityError:
        db.rollback()
        if not is_movie_liked(db, user_id, tmdb_movie_id):
            raise


def unlike_movie(db: Session, user_id: int, tmdb_movie_id: int) -> None:
    db.execute(delete(user_movie_likes).where(
        user_movie_likes.c.user_id == user_id,
        user_movie_likes.c.tmdb_movie_id == tmdb_movie_id,
    ))
    db.commit()
