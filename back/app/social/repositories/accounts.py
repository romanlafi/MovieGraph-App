"""Account persistence and public profiles, independent of HTTP."""

from collections.abc import Sequence
from uuid import uuid4

from sqlalchemy import insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.schemas.auth import UserProfile, UserRegistration, UserResponse
from app.social.contracts import AccountCredentials, SocialUser
from app.social.errors import AccountConflictCode, AccountCreationError, DuplicateAccountError
from app.social.tables import user_genre_preferences, users


def get_user_by_email(db: Session, email: str) -> SocialUser | None:
    row = db.execute(select(users.c.id, users.c.email, users.c.username).where(
        users.c.email == email,
    )).mappings().first()
    return SocialUser(**row) if row is not None else None


def get_account_by_email(db: Session, email: str) -> AccountCredentials | None:
    row = db.execute(select(
        users.c.id, users.c.email, users.c.username,
        users.c.password.label("password_hash"),
    ).where(users.c.email == email)).mappings().first()
    return AccountCredentials(**row) if row is not None else None


def account_conflict(db: Session, email: str, username: str) -> AccountConflictCode | None:
    if db.execute(select(users.c.id).where(users.c.email == email)).first() is not None:
        return "email_conflict"
    if db.execute(select(users.c.id).where(users.c.username == username)).first() is not None:
        return "user_conflict"
    return None


def create_account(db: Session, account: UserRegistration) -> None:
    from app.social.passwords import hash_password

    conflict = account_conflict(db, str(account.email), account.username)
    if conflict is not None:
        raise DuplicateAccountError(conflict)
    try:
        _insert_account(db, account, hash_password(account.password))
    except IntegrityError:
        db.rollback()
        conflict = account_conflict(db, str(account.email), account.username)
        if conflict is not None:
            raise DuplicateAccountError(conflict) from None
        raise AccountCreationError() from None


def _insert_account(db: Session, account: UserRegistration, password_hash: str) -> None:
    user_id = db.execute(insert(users).values(
        email=str(account.email), username=account.username,
        public_id=str(uuid4()),
        password=password_hash, birthdate=account.birthdate,
        bio=account.bio,
    ).returning(users.c.id)).scalar_one()
    preferences = [{"user_id": user_id, "genre_name": name}
                   for name in dict.fromkeys(account.favorite_genres)]
    if preferences:
        db.execute(insert(user_genre_preferences), preferences)
    db.commit()


def get_user_profile(db: Session, email: str) -> UserProfile | None:
    user = db.execute(select(
        users.c.id, users.c.public_id, users.c.email, users.c.username, users.c.birthdate, users.c.bio,
    ).where(users.c.email == email)).mappings().first()
    if user is None:
        return None
    genre_names = list(db.scalars(select(user_genre_preferences.c.genre_name).where(
        user_genre_preferences.c.user_id == user["id"],
    ).order_by(user_genre_preferences.c.genre_name)))
    return UserProfile(
        public_id=user["public_id"], email=user["email"], username=user["username"],
        birthdate=user["birthdate"], bio=user["bio"], favorite_genres=genre_names,
    )


def user_response(db: Session, user_id: int) -> UserResponse | None:
    responses = public_profiles(db, [user_id])
    return responses[0] if responses else None


def public_profiles(db: Session, user_ids: Sequence[int]) -> list[UserResponse]:
    if not user_ids:
        return []
    user_rows = db.execute(select(
        users.c.id, users.c.public_id, users.c.username, users.c.bio,
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
        UserResponse(
            public_id=user_by_id[user_id]["public_id"],
            username=user_by_id[user_id]["username"],
            bio=user_by_id[user_id]["bio"],
            favorite_genres=preferences_by_user[user_id],
        )
        for user_id in user_ids if user_id in user_by_id
    ]


def user_by_email(db: Session, email: str) -> UserResponse | None:
    user_id = db.scalar(select(users.c.id).where(users.c.email == email))
    return user_response(db, user_id) if user_id is not None else None


def user_by_public_id(db: Session, public_id: str) -> UserResponse | None:
    user_id = db.scalar(select(users.c.id).where(users.c.public_id == public_id))
    return user_response(db, user_id) if user_id is not None else None


def search_users(db: Session, query: str, exclude_email: str) -> list[UserResponse]:
    pattern = f"%{query.lower()}%"
    user_ids = db.scalars(select(users.c.id).where(
        users.c.email != exclude_email,
        users.c.username.ilike(pattern),
    ).order_by(users.c.username).limit(20)).all()
    return public_profiles(db, user_ids)


def list_users(db: Session, *, limit: int = 20, offset: int = 0) -> list[UserResponse]:
    user_ids = db.scalars(select(users.c.id).order_by(users.c.username).limit(limit).offset(offset)).all()
    return public_profiles(db, user_ids)
