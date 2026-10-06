import os
from urllib.parse import urlsplit


def required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ValueError(f"Missing required backend configuration: {name}")
    return value


def cors_origins() -> list[str]:
    defaults = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001"
    raw = os.getenv("CORS_ORIGINS", defaults if APP_ENV == "development" else "")
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    for origin in origins:
        parsed = urlsplit(origin)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.username is not None
            or parsed.password is not None
            or parsed.path
            or parsed.query
            or parsed.fragment
            or "*" in origin
        ):
            raise ValueError("CORS_ORIGINS must contain explicit HTTP(S) origins")
    return origins


# The local launcher supplies environment variables explicitly (--env-file is
# optional for Uvicorn). Workers use bindings; never load files at runtime.
APP_ENV = os.getenv("APP_ENV", "development")
CORS_ORIGINS = cors_origins()
SECRET_KEY = required_env("SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
try:
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
except ValueError:
    raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be a positive integer") from None
if ACCESS_TOKEN_EXPIRE_MINUTES <= 0:
    raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be a positive integer")

TMDB_API_KEY = required_env("TMDB_API_KEY")
TMDB_BASE_URL = os.getenv("TMDB_BASE_URL", "https://api.themoviedb.org/3")
TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w500"

# Database configuration is resolved by app.db.runtime at request time.
