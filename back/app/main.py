from fastapi.middleware.cors import CORSMiddleware

from app.application import create_app
from app.core.config import cors_origins


app = create_app(include_social_api=True, include_account_api=True, include_follows_api=True)
origins = cors_origins()
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
