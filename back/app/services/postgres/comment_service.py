from sqlalchemy.orm import Session

from app.exceptions import UserNotFoundError, MovieNotFoundError
from app.models.comment import Comment
from app.models.movie import Movie
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentResponse


def create_comment(db: Session, user_email: str, comment: CommentCreate):
    user = db.query(User).filter_by(email=user_email).first()
    movie = db.query(Movie).filter_by(id=comment.movie_id).first()

    if not user:
        raise UserNotFoundError()
    if not movie:
        raise MovieNotFoundError()

    new_comment = Comment(
        user_id=user.id,
        movie_id=movie.id,
        text=comment.text
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return CommentResponse(
        comment_id=new_comment.id,
        username=user.username,
        text=new_comment.text,
        created_at=new_comment.created_at
    )

def list_movie_comments(db: Session, movie_id: int):
    comments = (
        db.query(Comment)
        .filter_by(movie_id=movie_id)
        .order_by(Comment.created_at.desc())
        .all()
    )

    return [
        CommentResponse(
            comment_id=c.id,
            username=c.user.username,
            text=c.text,
            created_at=c.created_at
        )
        for c in comments
    ]