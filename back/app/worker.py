"""Deployed API and assets; Wrangler selects production or preview bindings."""

from workers import asgi

from app.application import create_app

app = create_app(
    include_social_api=True,
    include_account_api=True,
    include_follows_api=True,
    include_assets=True,
)
Default = asgi.entrypoint(app)
