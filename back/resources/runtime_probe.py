"""Trusted development setup / HTTP probe runner. No legacy tables imported."""

import argparse
import json
import os

import httpx
from sqlalchemy.exc import SQLAlchemyError

from app.db.database import engine_scope
from app.db.probe import setup_probe_table
from app.db.runtime import DatabaseConfig, DatabaseConfigurationError


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=("setup", "verify"))
    parser.add_argument("--development-database", action="store_true", required=True,
                        help="Confirm target is a dedicated development database")
    parser.add_argument("--worker-url", default="http://127.0.0.1:8789")
    args = parser.parse_args()
    try:
        if args.operation == "setup":
            raw = os.getenv("DB_PROBE_DATABASE_URL", "")
            if not raw:
                raise DatabaseConfigurationError("Set DB_PROBE_DATABASE_URL for the Neon development branch")
            with engine_scope(DatabaseConfig.local(raw)) as engine:
                setup_probe_table(engine)
            print("Development runtime probe table ready; no application tables changed")
        else:
            token = os.getenv("DB_PROBE_TOKEN", "")
            if not token:
                raise DatabaseConfigurationError("Set DB_PROBE_TOKEN to match the diagnostic Worker secret")
            if not args.worker_url.startswith(("http://127.0.0.1:", "http://localhost:", "https://")):
                raise DatabaseConfigurationError("Use loopback HTTP or HTTPS for the diagnostic Worker")
            response = httpx.post(f"{args.worker_url.rstrip('/')}/api/internal/db-probe",
                                  headers={"Authorization": f"Bearer {token}"}, timeout=60,
                                  follow_redirects=False)
            expected = {key: "PASS" for key in ("select", "insert", "update", "rollback", "delete", "session_cleanup")}
            if response.status_code != 200 or response.json() != expected:
                print("Worker DB verification failed; check binding, authorization and probe setup")
                return 1
            print(json.dumps(expected))
    except DatabaseConfigurationError as exc:
        print(str(exc))
        return 1
    except (SQLAlchemyError, httpx.HTTPError, ValueError):
        print("Probe failed; check development database configuration and connectivity")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
