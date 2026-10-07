import argparse
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import time

from dotenv import dotenv_values
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.pool import NullPool
from alembic.config import Config
from alembic.script import ScriptDirectory

from local_processes import (FRONTEND, FRONTEND_PORT, ROOT, WORKER_PORT, port_is_open,
                             stop_process_tree, wait_for_local_api, wait_for_port)


LOCAL_CONFIG = ROOT / ".local.env"
LOCAL_WORKER_SECRETS = ROOT / ".dev.vars.local"
DATABASE_PORT = 5442
sys.path.insert(0, str(ROOT / "back"))


def read_local_password() -> str:
    if not LOCAL_CONFIG.exists():
        with LOCAL_CONFIG.open("x", encoding="utf-8") as config:
            config.write(f"LOCAL_DB_PASSWORD={secrets.token_hex(32)}\n")
    password = dotenv_values(LOCAL_CONFIG, interpolate=False).get("LOCAL_DB_PASSWORD")
    if not password or any(character not in "0123456789abcdef" for character in password) or len(password) != 64:
        raise RuntimeError("Invalid .local.env; LOCAL_DB_PASSWORD must be the generated 64-character hex value")
    return password


def prepare_worker_secrets() -> None:
    existing = dotenv_values(LOCAL_WORKER_SECRETS, interpolate=False) if LOCAL_WORKER_SECRETS.exists() else {}
    source = dotenv_values(ROOT / ".dev.vars", interpolate=False)
    secret_key = existing.get("SECRET_KEY") or secrets.token_urlsafe(48)
    values = {name: source[name] for name in ("TMDB_READ_ACCESS_TOKEN", "TMDB_API_KEY", "TMDB_BASE_URL") if source.get(name)}
    values["SECRET_KEY"] = secret_key
    content = "".join(f"{name}={json.dumps(value)}\n" for name, value in values.items())
    LOCAL_WORKER_SECRETS.write_text(content, encoding="utf-8")


def local_database_url(password: str, driver: bool = True) -> str:
    scheme = "postgresql+pg8000" if driver else "postgresql"
    return f"{scheme}://moviegraph_local:{password}@127.0.0.1:{DATABASE_PORT}/moviegraph_local"


def compose_arguments(*arguments: str) -> list[str]:
    return ["docker", "compose", "--project-name", "moviegraph-local", "--env-file", str(LOCAL_CONFIG),
            "--file", str(ROOT / "compose.local.yaml"), *arguments]


def start_database(environment: dict[str, str]) -> None:
    if shutil.which("docker") is None:
        raise RuntimeError("Docker Desktop is required for PostgreSQL local development")
    try:
        status = subprocess.run(["docker", "info", "--format", "{{.ServerVersion}}"],
                                capture_output=True, text=True, timeout=60)
    except subprocess.TimeoutExpired:
        raise RuntimeError("Docker Desktop is not responding. Wait until its engine is ready, then run MovieGraph Local again") from None
    if status.returncode:
        raise RuntimeError("Start Docker Desktop and run MovieGraph Local again")
    subprocess.run(compose_arguments("up", "--detach", "--wait", "--wait-timeout", "90", "postgres"),
                   cwd=ROOT, env=environment, check=True, timeout=180)


def database_inventory(database_url: str) -> dict:
    engine = create_engine(database_url, poolclass=NullPool, hide_parameters=True,
                           connect_args={"timeout": 10})
    try:
        with engine.connect() as connection:
            tables = inspect(connection).get_table_names()
            revision = connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one() if "alembic_version" in tables else None
            return {"target": "local-development", "database": "moviegraph_local", "revision": revision,
                    "tables": tables}
    finally:
        engine.dispose()


def apply_local_migrations(database_url: str, environment: dict[str, str]) -> None:
    migration_environment = {**environment, "ALEMBIC_DATABASE_URL": database_url,
                             "ALEMBIC_TARGET": "local-development", "ALEMBIC_ALLOW_DATA_MIGRATION": "1"}
    result = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=ROOT / "back",
                            env=migration_environment, capture_output=True, text=True, timeout=60)
    if result.returncode:
        raise RuntimeError("Local migration failed; credentials were not logged. Inspect the isolated local schema before retrying")


def check_local_schema(database_url: str) -> dict:
    inventory = database_inventory(database_url)
    required = {
        "users", "comments", "user_movie_likes", "user_genre_preferences",
        "user_follows", "alembic_version",
    }
    migration_config = Config(str(ROOT / "back" / "alembic.ini"))
    migration_config.set_main_option("script_location", str(ROOT / "back" / "migrations"))
    expected_revision = ScriptDirectory.from_config(migration_config).get_current_head()
    if inventory["revision"] != expected_revision or not required.issubset(inventory["tables"]):
        raise RuntimeError("Local schema is not ready. Run MovieGraph Setup Local DB once, then MovieGraph Local")
    return inventory


def run_application(environment: dict[str, str], worker_only: bool = False, worker_port: int = WORKER_PORT) -> None:
    if not worker_only and (not (FRONTEND / "node_modules").is_dir() or shutil.which("npm.cmd" if os.name == "nt" else "npm") is None):
        raise RuntimeError("Install frontend dependencies with npm ci and configure Node.js in PyCharm")
    for port in ((worker_port,) if worker_only else (worker_port, FRONTEND_PORT)):
        if port_is_open(port):
            raise RuntimeError(f"Port {port} is occupied. Stop the existing MovieGraph process before running Local")
    processes = []
    try:
        worker = subprocess.Popen([sys.executable, "-m", "pywrangler", "dev", "--config", "wrangler.local.jsonc",
                                   "--env", "local", "--ip", "127.0.0.1", "--port", str(worker_port)],
                                  cwd=ROOT, env=environment)
        processes.append(worker)
        wait_for_port(worker, worker_port, "Worker")
        wait_for_local_api(worker, worker_port)
        if not worker_only:
            frontend_command = ["npm.cmd", "run", "dev", "--", "--host", "127.0.0.1", "--port", str(FRONTEND_PORT), "--strictPort"]
            frontend = subprocess.Popen(["cmd.exe", "/d", "/s", "/c", " ".join(frontend_command)] if os.name == "nt" else ["npm", *frontend_command[1:]],
                                        cwd=FRONTEND, env=environment)
            processes.append(frontend)
            wait_for_port(frontend, FRONTEND_PORT, "Frontend")
        address = f"http://127.0.0.1:{worker_port}/api/health" if worker_only else "http://127.0.0.1:5173/"
        print(f"MovieGraph Local: {address} — PostgreSQL local, not Neon", flush=True)
        print("Catalogue, account, follows, comments, likes, and recommendations are mounted on the local database.", flush=True)
        while True:
            if any(process.poll() is not None for process in processes):
                raise RuntimeError("A local MovieGraph process exited")
            time.sleep(0.5)
    finally:
        for process in reversed(processes):
            stop_process_tree(process)


def main() -> int:
    parser = argparse.ArgumentParser(description="Isolated MovieGraph local PostgreSQL/Worker development")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--setup-db", action="store_true", help="Explicitly initialize/upgrade the local schema, then exit")
    mode.add_argument("--check-db", action="store_true", help="Check local migration head, then exit")
    mode.add_argument("--worker-only", action="store_true", help="Run only the local Worker for integration verification")
    parser.add_argument("--worker-port", type=int, default=WORKER_PORT)
    arguments = parser.parse_args()
    if not 1 <= arguments.worker_port <= 65535 or (not arguments.worker_only and arguments.worker_port != WORKER_PORT):
        parser.error("A custom Worker port is available only with --worker-only")
    try:
        password = read_local_password()
        prepare_worker_secrets()
        environment = os.environ.copy()
        environment["LOCAL_DB_PASSWORD"] = password
        environment["CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE"] = local_database_url(password, driver=False)
        environment["PATH"] = str(Path(sys.executable).parent) + os.pathsep + environment.get("PATH", "")
        environment["PYTHONUNBUFFERED"] = "1"
        environment["PYTHONIOENCODING"] = "utf-8"
        environment["VITE_API_PROD_URL"] = f"http://127.0.0.1:{FRONTEND_PORT}/api/v1"
        start_database(environment)
        database_url = local_database_url(password)
        if arguments.setup_db:
            apply_local_migrations(database_url, environment)
        inventory = check_local_schema(database_url)
        if arguments.setup_db or arguments.check_db:
            print(json.dumps(inventory, indent=2), flush=True)
            return 0
        run_application(environment, worker_only=arguments.worker_only, worker_port=arguments.worker_port)
        return 0
    except KeyboardInterrupt:
        print("MovieGraph Local stopped; PostgreSQL data remains in its local volume", flush=True)
        return 0
    except Exception as error:
        if isinstance(error, RuntimeError):
            print(str(error), flush=True)
        else:
            print(f"Local setup stopped ({type(error).__name__}); no connection credentials were printed", flush=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
