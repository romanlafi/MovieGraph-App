from typing import List

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.exceptions import UserNotFoundError
from app.models.user import User
from app.schemas.user import UserResponse


def get_user_by_email(db: Session, email: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise UserNotFoundError()
    return user

def add_friend(db: Session, user_email: str, friend_email: str):
    user = get_user_by_email(db, user_email)
    friend = get_user_by_email(db, friend_email)

    if friend not in user.friends:
        user.friends.append(friend)
    if user not in friend.friends:
        friend.friends.append(user)

    db.commit()

def remove_friend(db: Session, user_email: str, friend_email: str):
    user = get_user_by_email(db, user_email)
    friend = get_user_by_email(db, friend_email)

    if friend in user.friends:
        user.friends.remove(friend)
    if user in friend.friends:
        friend.friends.remove(user)
    db.commit()

def get_friends(db: Session, user_email: str):
    user = get_user_by_email(db, user_email)
    return user.friends

def are_friends(db: Session, user_email: str, other_email: str) -> bool:
    user = get_user_by_email(db, user_email)
    other = get_user_by_email(db, other_email)
    return other in user.friends

def list_all_users(db: Session) -> List[User]:
    return db.query(User).order_by(User.username).all()

def get_user_detail_by_email(db: Session, email: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise UserNotFoundError()
    return user

def search_users_by_username_or_email(db: Session, query_str: str):
    query_lower = f"%{query_str.lower()}%"
    users = db.query(User).filter(
        or_(
            func.lower(User.username).like(query_lower),
            func.lower(User.email).like(query_lower)
        )
    ).order_by(User.username).limit(20).all()

    return [
        UserResponse(
            id=u.id,
            email=u.email,
            username=u.username,
            birthdate=u.birthdate,
            bio=u.bio,
            favorite_genres=[g.name for g in u.favorite_genres]  # Aquí convertimos a nombres
        )
        for u in users
    ]