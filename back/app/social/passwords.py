"""Password helpers compatible with existing bcrypt hashes and Workers."""

import bcrypt


def _bcrypt_input(password: str) -> bytes:
    encoded = password.encode("utf-8")
    if len(encoded) > 72:
        raise ValueError("Password must not exceed 72 UTF-8 bytes")
    return encoded


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_bcrypt_input(password), bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(_bcrypt_input(password), hashed_password.encode("ascii"))
    except (UnicodeEncodeError, ValueError, TypeError):
        return False
