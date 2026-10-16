"""Local-only Worker: direct PostgreSQL SCRAM, never a deployment entrypoint."""

from app.application import create_app
from app.core.request_completion import entrypoint
from app.db.database import prepare_worker_database
from app.db.local_scram import install_local_scram_compatibility


install_local_scram_compatibility()
prepare_worker_database()

app = create_app(
        include_social_api=True,
    include_account_api=True,
    include_follows_api=True,
)
Default = entrypoint(app)
