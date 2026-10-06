"""Explicit development harness; never use as the production entrypoint."""

from workers import asgi

from application import create_app
from db.diagnostics import install_diagnostics

app = create_app(include_legacy_api=False)
install_diagnostics(app)
Default = asgi.entrypoint(app)
