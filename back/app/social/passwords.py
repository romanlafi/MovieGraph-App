"""Password helpers compatible with existing bcrypt hashes and Workers."""

import bcrypt


def _bcrypt_input(password: str) -> bytes:
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_bcrypt_input(password), bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(_bcrypt_input(password), hashed_password.encode("ascii"))
    except (UnicodeEncodeError, ValueError, TypeError):
        return False
