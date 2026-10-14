import os
from urllib.parse import urlsplit


def cors_origins() -> list[str]:
    defaults = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001"
    environment = os.getenv("APP_ENV", "development")
    raw = os.getenv("CORS_ORIGINS", defaults if environment == "development" else "")
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
