"""Disposable DEV verification harness; never use as production entrypoint."""

from workers import asgi

from application import create_app
from social.probe import install_social_probe


app = create_app(include_legacy_api=False, include_social_api=True)
install_social_probe(app)
Default = asgi.entrypoint(app)
