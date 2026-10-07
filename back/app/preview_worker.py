"""Deployed API and assets; database bindings are selected by Wrangler config."""

from workers import asgi

from application import create_app


app = create_app(include_legacy_api=False, include_social_api=True, include_assets=True)
Default = asgi.entrypoint(app)
