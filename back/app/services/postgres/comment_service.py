from sqlalchemy.orm import Session

from app.exceptions import UserNotFoundError
from app.schemas.comment import CommentCreate, CommentResponse
from app.social import store


def create_comment(db: Session, user_email: str, tmdb_movie_id: int, comment: CommentCreate):
    user = store.get_user_by_email(db, user_email)
    if not user:
        raise UserNotFoundError()

    return CommentResponse(**store.create_comment(db, user, tmdb_movie_id, comment.text))

def list_movie_comments(db: Session, tmdb_movie_id: int):
    return [CommentResponse(**row) for row in store.list_movie_comments(db, tmdb_movie_id)]
