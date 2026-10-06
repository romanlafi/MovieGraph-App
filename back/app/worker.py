"""Health and TMDB gateway; legacy API awaits verified Hyperdrive integration."""

from workers import asgi

from application import create_app

# Wrangler loads modules beside this entrypoint. Keep its source directory
# separate from local virtual environments and configuration files.
# Do not import the native legacy DB/auth stack until runtime validation.
app = create_app(include_legacy_api=False)
Default = asgi.entrypoint(app)
