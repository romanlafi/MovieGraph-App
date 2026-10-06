"""Development candidate: TMDB gateway and authenticated social API slice."""

from workers import asgi

from application import create_app


app = create_app(include_legacy_api=False, include_social_api=True)
Default = asgi.entrypoint(app)
