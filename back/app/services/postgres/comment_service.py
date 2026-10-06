from sqlalchemy.orm import Session

from app.exceptions import UserNotFoundError
from app.models.comment import Comment
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentResponse


def create_comment(db: Session, user_email: str, tmdb_movie_id: int, comment: CommentCreate):
    user = db.query(User).filter_by(email=user_email).first()
    if not user:
        raise UserNotFoundError()

    new_comment = Comment(
        user_id=user.id,
        tmdb_movie_id=tmdb_movie_id,
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

def list_movie_comments(db: Session, tmdb_movie_id: int):
    comments = (
        db.query(Comment)
        .filter_by(tmdb_movie_id=tmdb_movie_id)
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
