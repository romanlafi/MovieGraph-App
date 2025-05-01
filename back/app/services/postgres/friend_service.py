from sqlalchemy.orm import Session

from app.exceptions import UserNotFoundError
from app.models.user import User


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