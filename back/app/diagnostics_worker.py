"""Protected development diagnostics; never an application entrypoint."""

from app.application import create_app
from app.core.request_completion import entrypoint
from app.db.diagnostics import install_diagnostics
from app.social.probe import install_social_probe


app = create_app(include_social_api=True, include_account_api=True, include_follows_api=True)
install_diagnostics(app)
install_social_probe(app)
app.state.db_lock = app.state.social_db_lock
Default = entrypoint(app)
