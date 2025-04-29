from datetime import timedelta

from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.security import hash_password, verify_password, create_access_token
from app.exceptions import UserConflictError, UserNotFoundError, InvalidCredentialsError
from app.graph.queries.user import get_user_by_email, create_user_node
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse


def register_user(user: UserCreate) -> UserResponse:
    if get_user_by_email(str(user.email)):
        raise UserConflictError()

    hashed_pw = hash_password(user.password)

    node = create_user_node(
        username = user.username,
        email = str(user.email),
        password = hashed_pw,
        birthdate = user.birthdate,
        bio = user.bio,
        favorite_genres = user.favorite_genres
    )
    return format_user_node(node)

def authenticate_user(user: UserLogin) -> Token:
    user_node = get_user_by_email(str(user.email))
    if not user_node:
        raise UserNotFoundError()

    if not verify_password(user.password, user_node["password"]):
        raise InvalidCredentialsError()

    token = create_access_token(
        data={"sub": user_node["email"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return Token(access_token=token)

def format_user_node(node) -> UserResponse:
    return UserResponse(
        username=node["username"],
        email=node["email"],
        birthdate=node["birthdate"],
        bio=node.get("bio", ""),
        favorite_genres=node.get("favorite_genres", [])
    )

