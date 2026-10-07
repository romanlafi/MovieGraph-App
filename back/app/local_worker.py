"""Local-only Worker: direct PostgreSQL SCRAM, never a deployment entrypoint."""

from db.local_scram import install_local_scram_compatibility


install_local_scram_compatibility()

from social_worker import Default
