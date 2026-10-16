"""Deployed API and assets; Wrangler selects production or preview bindings."""

from app.application import create_app
from app.core.request_completion import entrypoint
from app.db.database import prepare_worker_database

prepare_worker_database()
app = create_app(
    include_social_api=True,
    include_account_api=True,
    include_follows_api=True,
    include_assets=True,
)
Default = entrypoint(app)
