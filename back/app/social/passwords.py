"""Password helpers compatible with existing bcrypt hashes and Workers."""

import re

from sqlalchemy import text
from sqlalchemy.orm import Session


def _bcrypt_input(password: str) -> bytes:
    encoded = password.encode("utf-8")
    if b"\x00" in encoded:
        raise ValueError("Password must not contain null characters")
    if len(encoded) > 72:
        raise ValueError("Password must not exceed 72 UTF-8 bytes")
    return encoded


def hash_password(password: str) -> str:
    import bcrypt

    return bcrypt.hashpw(_bcrypt_input(password), bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_password(password: str, hashed_password: str) -> bool:
    import bcrypt

    try:
        return bcrypt.checkpw(_bcrypt_input(password), hashed_password.encode("ascii"))
    except (UnicodeEncodeError, ValueError, TypeError):
        return False


def hash_password_in_database(db: Session, password: str) -> str:
    _bcrypt_input(password)
    return db.execute(text(
        "SELECT public.crypt(:password, public.gen_salt('bf', 12))"
    ), {"password": password}).scalar_one()


def verify_password_in_database(db: Session, password: str, hashed_password: str) -> bool:
    """pgcrypto accepts 2a salts; modern bcrypt payloads agree up to 72 UTF-8 bytes."""
    try:
        _bcrypt_input(password)
        if not re.fullmatch(r"\$2[aby]\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}", hashed_password):
            return False
    except (UnicodeEncodeError, ValueError, TypeError):
        return False
    compatible_hash = "$2a$" + hashed_password[4:]
    return db.execute(text(
        "SELECT public.crypt(:password, :password_hash) = :password_hash"
    ), {"password": password, "password_hash": compatible_hash}).scalar_one() is True
