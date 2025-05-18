from typing import List

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.exceptions import UserNotFoundError
from app.models.user import User
from app.schemas.user import UserResponse


def get_user_orm_by_email(db: Session, email: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise UserNotFoundError()
    return user


# === PUBLIC API ===

def get_user_response_by_email(db: Session, email: str) -> UserResponse:
    user = get_user_orm_by_email(db, email)
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        birthdate=user.birthdate,
        bio=user.bio,
        favorite_genres=[g.name for g in user.favorite_genres]
    )


def follow_user(db: Session, follower_email: str, followed_email: str):
    follower = get_user_orm_by_email(db, follower_email)
    followed = get_user_orm_by_email(db, followed_email)

    if followed not in follower.following:
        follower.following.append(followed)
        db.commit()


def unfollow_user(db: Session, follower_email: str, followed_email: str):
    follower = get_user_orm_by_email(db, follower_email)
    followed = get_user_orm_by_email(db, followed_email)

    if followed in follower.following:
        follower.following.remove(followed)
        db.commit()


def get_following(db: Session, user_email: str) -> List[UserResponse]:
    user = get_user_orm_by_email(db, user_email)
    return [
        UserResponse(
            id=u.id,
            email=u.email,
            username=u.username,
            birthdate=u.birthdate,
            bio=u.bio,
            favorite_genres=[g.name for g in u.favorite_genres]
        )
        for u in user.following
    ]


def get_followers(db: Session, user_email: str) -> List[UserResponse]:
    user = get_user_orm_by_email(db, user_email)
    return [
        UserResponse(
            id=u.id,
            email=u.email,
            username=u.username,
            birthdate=u.birthdate,
            bio=u.bio,
            favorite_genres=[g.name for g in u.favorite_genres]
        )
        for u in user.followers
    ]


def list_all_users(db: Session) -> List[UserResponse]:
    users = db.query(User).order_by(User.username).all()
    return [
        UserResponse(
            id=u.id,
            email=u.email,
            username=u.username,
            birthdate=u.birthdate,
            bio=u.bio,
            favorite_genres=[g.name for g in u.favorite_genres]
        )
        for u in users
    ]


def search_users_by_username_or_email(db: Session, query_str: str, exclude_email: str) -> List[UserResponse]:
    query_lower = f"%{query_str.lower()}%"
    users = db.query(User).filter(
        or_(
            func.lower(User.username).like(query_lower),
            func.lower(User.email).like(query_lower)
        )
    ).filter(User.email != exclude_email).order_by(User.username).limit(20).all()

    return [
        UserResponse(
            id=u.id,
            email=u.email,
            username=u.username,
            birthdate=u.birthdate,
            bio=u.bio,
            favorite_genres=[g.name for g in u.favorite_genres]
        )
        for u in users
    ]