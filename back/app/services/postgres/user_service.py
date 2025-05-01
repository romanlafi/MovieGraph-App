from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.models.genre import Genre
from app.models.user import User
from app.schemas.user import UserCreate


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_user(db: Session, user_data: UserCreate) -> User:
    genres = []
    for genre_name in user_data.favorite_genres:
        genre = db.query(Genre).filter_by(name=genre_name).first()
        if not genre:
            genre = Genre(name=genre_name)
            db.add(genre)
            db.flush()
        genres.append(genre)

    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        username=user_data.username,
        password=hashed_password,
        birthdate=user_data.birthdate,
        bio=user_data.bio,
        favorite_genres=genres,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user