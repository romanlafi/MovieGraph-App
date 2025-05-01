from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import SECRET_KEY, JWT_ALGORITHM
from app.db.database import get_db
from app.exceptions import InvalidCredentialsError
from app.models.user import User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/users/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise InvalidCredentialsError()
    except JWTError:
        raise InvalidCredentialsError()

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise InvalidCredentialsError()
    return user