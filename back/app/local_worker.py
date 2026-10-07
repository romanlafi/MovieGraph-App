"""Local-only Worker: direct PostgreSQL SCRAM, never a deployment entrypoint."""

from db.local_scram import install_local_scram_compatibility


install_local_scram_compatibility()

from workers import asgi
from application import create_app

app = create_app(
    include_legacy_api=False,
    include_social_api=True,
    include_account_api=True,
    include_follows_api=True,
)
Default = asgi.entrypoint(app)
