from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user_movie_like import UserMovieLike


def list_user_likes(db: Session, user_id: int) -> list[int]:
    return [
        row.tmdb_movie_id
        for row in db.query(UserMovieLike)
        .filter_by(user_id=user_id)
        .order_by(UserMovieLike.tmdb_movie_id)
        .all()
    ]


def is_movie_liked(db: Session, user_id: int, tmdb_movie_id: int) -> bool:
    return db.query(UserMovieLike.user_id).filter_by(
        user_id=user_id,
        tmdb_movie_id=tmdb_movie_id,
    ).first() is not None


def like_movie(db: Session, user_id: int, tmdb_movie_id: int) -> None:
    if is_movie_liked(db, user_id, tmdb_movie_id):
        return

    try:
        with db.begin_nested():
            db.add(UserMovieLike(user_id=user_id, tmdb_movie_id=tmdb_movie_id))
            db.flush()
        db.commit()
    except IntegrityError:
        db.rollback()
        if not is_movie_liked(db, user_id, tmdb_movie_id):
            raise


def unlike_movie(db: Session, user_id: int, tmdb_movie_id: int) -> None:
    db.query(UserMovieLike).filter_by(
        user_id=user_id,
        tmdb_movie_id=tmdb_movie_id,
    ).delete(synchronize_session=False)
    db.commit()
