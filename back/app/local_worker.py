"""Local-only Worker: direct PostgreSQL SCRAM, never a deployment entrypoint."""

from workers import asgi

from app.application import create_app
from app.db.local_scram import install_local_scram_compatibility


install_local_scram_compatibility()

app = create_app(
        include_social_api=True,
    include_account_api=True,
    include_follows_api=True,
)
Default = asgi.entrypoint(app)
