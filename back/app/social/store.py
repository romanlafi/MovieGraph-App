"""MovieGraph social queries shared by the local API and Worker."""

from dataclasses import dataclass
from datetime import datetime, UTC

from sqlalchemy import delete, insert, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .tables import comments, user_follows, user_genre_preferences, user_movie_likes, users


@dataclass(frozen=True)
class SocialUser:
    id: int
    email: str
    username: str


def get_user_by_email(db: Session, email: str) -> SocialUser | None:
    row = db.execute(select(users.c.id, users.c.email, users.c.username).where(
        users.c.email == email,
    )).mappings().first()
    return SocialUser(**row) if row is not None else None


def get_account_by_email(db: Session, email: str) -> dict | None:
    return db.execute(select(
        users.c.id, users.c.email, users.c.username, users.c.password,
        users.c.birthdate, users.c.bio,
    ).where(users.c.email == email)).mappings().first()


def account_conflict(db: Session, email: str, username: str) -> str | None:
    if db.execute(select(users.c.id).where(users.c.email == email)).first() is not None:
        return "email_conflict"
    if db.execute(select(users.c.id).where(users.c.username == username)).first() is not None:
        return "user_conflict"
    return None


def create_account(db: Session, account: dict) -> None:
    from .passwords import hash_password

    user_id = db.execute(insert(users).values(
        email=account["email"], username=account["username"],
        password=hash_password(account["password"]), birthdate=account["birthdate"],
        bio=account["bio"],
    ).returning(users.c.id)).scalar_one()
    preferences = [{"user_id": user_id, "genre_name": name}
                   for name in dict.fromkeys(account["favorite_genres"])]
    if preferences:
        db.execute(insert(user_genre_preferences), preferences)
    db.commit()


def get_user_profile(db: Session, email: str) -> dict | None:
    user = db.execute(select(
        users.c.id, users.c.email, users.c.username, users.c.birthdate, users.c.bio,
    ).where(users.c.email == email)).mappings().first()
    if user is None:
        return None
    genre_names = list(db.scalars(select(user_genre_preferences.c.genre_name).where(
        user_genre_preferences.c.user_id == user["id"],
    ).order_by(user_genre_preferences.c.genre_name)))
    return {
        "email": user["email"],
        "username": user["username"],
        "birthdate": user["birthdate"],
        "bio": user["bio"],
        "favorite_genres": genre_names,
    }


def user_response(db: Session, user_id: int) -> dict | None:
    responses = _user_responses(db, [user_id])
    return responses[0] if responses else None


def _user_responses(db: Session, user_ids: list[int]) -> list[dict]:
    if not user_ids:
        return []
    user_rows = db.execute(select(
        users.c.id, users.c.email, users.c.username, users.c.birthdate, users.c.bio,
    ).where(users.c.id.in_(user_ids))).mappings().all()
    user_by_id = {row["id"]: dict(row) for row in user_rows}
    preferences_by_user: dict[int, list[str]] = {user_id: [] for user_id in user_by_id}
    preference_rows = db.execute(select(
        user_genre_preferences.c.user_id, user_genre_preferences.c.genre_name,
    ).where(user_genre_preferences.c.user_id.in_(user_by_id)).order_by(
        user_genre_preferences.c.genre_name,
    ))
    for user_id, genre_name in preference_rows:
        preferences_by_user[user_id].append(genre_name)
    return [
        {**user_by_id[user_id], "favorite_genres": preferences_by_user[user_id]}
        for user_id in user_ids if user_id in user_by_id
    ]


def user_by_email(db: Session, email: str) -> dict | None:
    user_id = db.scalar(select(users.c.id).where(users.c.email == email))
    return user_response(db, user_id) if user_id is not None else None


def search_users(db: Session, query: str, exclude_email: str) -> list[dict]:
    pattern = f"%{query.lower()}%"
    user_ids = db.scalars(select(users.c.id).where(
        users.c.email != exclude_email,
        or_(users.c.username.ilike(pattern), users.c.email.ilike(pattern)),
    ).order_by(users.c.username).limit(20)).all()
    return _user_responses(db, user_ids)


def list_users(db: Session) -> list[dict]:
    user_ids = db.scalars(select(users.c.id).order_by(users.c.username)).all()
    return _user_responses(db, user_ids)


def follow_user(db: Session, follower_id: int, followed_email: str) -> str | None:
    followed_id = db.scalar(select(users.c.id).where(users.c.email == followed_email))
    if followed_id is None:
        return None
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


def unfollow_user(db: Session, follower_id: int, followed_email: str) -> str | None:
    followed_id = db.scalar(select(users.c.id).where(users.c.email == followed_email))
    if followed_id is None:
        return None
    db.execute(delete(user_follows).where(
        user_follows.c.follower_id == follower_id,
        user_follows.c.followed_id == followed_id,
    ))
    db.commit()
    return "unfollowed"


def list_following(db: Session, user_id: int) -> list[dict]:
    user_ids = db.scalars(select(user_follows.c.followed_id).where(
        user_follows.c.follower_id == user_id,
    ).order_by(user_follows.c.followed_id)).all()
    return _user_responses(db, user_ids)


def list_followers(db: Session, user_id: int) -> list[dict]:
    user_ids = db.scalars(select(user_follows.c.follower_id).where(
        user_follows.c.followed_id == user_id,
    ).order_by(user_follows.c.follower_id)).all()
    return _user_responses(db, user_ids)


def list_followed_user_like_ids(db: Session, user_id: int, limit: int = 100) -> list[int]:
    return list(db.scalars(select(user_movie_likes.c.tmdb_movie_id).select_from(
        user_follows.join(
            user_movie_likes,
            user_follows.c.followed_id == user_movie_likes.c.user_id,
        ),
    ).where(
        user_follows.c.follower_id == user_id,
    ).distinct().order_by(user_movie_likes.c.tmdb_movie_id).limit(limit)))


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
