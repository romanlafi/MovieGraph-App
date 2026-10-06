"""Verify the configured DEV Hyperdrive and social API using disposable rows."""

from datetime import datetime, timedelta, UTC
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory
import time
from uuid import uuid4

import bcrypt
import httpx
from jose import jwt

from run_preview import stop_process_tree


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "wrangler.social-probe.jsonc"


def verify_hyperdrive(environment: dict[str, str]) -> dict:
    binding = json.loads(CONFIG.read_text(encoding="utf-8"))["hyperdrive"][0]
    identifier = binding["id"]
    if not re.fullmatch(r"[0-9a-f]{32}", identifier):
        raise RuntimeError("Invalid development Hyperdrive identifier")
    args = ["npx", "--yes", "wrangler", "hyperdrive", "get", identifier]
    if os.name == "nt":
        args = ["cmd.exe", "/d", "/c", f"npx.cmd --yes wrangler hyperdrive get {identifier}"]
    response = subprocess.run(args, cwd=ROOT, env=environment, capture_output=True,
                              text=True, encoding="utf-8", check=False)
    if response.returncode != 0:
        raise RuntimeError("Unable to inspect the configured DEV Hyperdrive with Wrangler")
    start, end = response.stdout.find("{"), response.stdout.rfind("}")
    config = json.loads(response.stdout[start:end + 1])
    if (config.get("name") != "moviegraph-dev"
            or config.get("origin", {}).get("database") != "moviegraph"
            or not config.get("origin", {}).get("host", "").endswith(".neon.tech")
            or config.get("caching", {}).get("disabled") is not True):
        raise RuntimeError("Hyperdrive does not match the configured MovieGraph DEV target with caching disabled")
    return {"id": identifier, "name": config["name"], "database": "moviegraph", "caching_disabled": True}


def wait_for_worker(base_url: str, client: httpx.Client) -> None:
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        try:
            if client.get(f"{base_url}/api/health", timeout=5).status_code == 200:
                return
        except httpx.HTTPError:
            pass
        time.sleep(0.5)
    raise RuntimeError("Temporary development Worker did not become ready")


def run_verification() -> dict:
    if shutil.which("npx.cmd" if os.name == "nt" else "npx") is None:
        raise RuntimeError("Node.js/npx is required by the existing Worker toolchain")
    environment = os.environ.copy()
    environment["PATH"] = str(Path(sys.executable).parent) + os.pathsep + environment.get("PATH", "")
    environment["PYTHONUNBUFFERED"] = "1"
    environment["PYTHONIOENCODING"] = "utf-8"
    print("Checking the existing MovieGraph DEV Hyperdrive...", flush=True)
    hyperdrive = verify_hyperdrive(environment)
    signing_secret = secrets.token_urlsafe(48)
    probe_secret = secrets.token_urlsafe(48)
    fixture_id = uuid4()
    worker_name = f"moviegraph-probe-dev-{fixture_id.hex}"
    report = {"target": "neon-development", "hyperdrive": hyperdrive, "fixture_id": str(fixture_id)}
    requests = {}
    fixture_attempted = False
    fixture = None
    process = None
    deployment_attempted = False
    deployment_succeeded = False
    base_url = ""

    temporary_root = ROOT / ".wrangler"
    temporary_root.mkdir(exist_ok=True)
    with TemporaryDirectory(prefix="social-verification-", dir=temporary_root) as directory:
        log_path = Path(directory) / "worker.log"
        worker_config = ROOT / f"wrangler.social-verification-{fixture_id.hex}.jsonc"
        config = json.loads(CONFIG.read_text(encoding="utf-8"))
        config["name"] = worker_name
        config["main"] = str(ROOT / config["main"])
        config["workers_dev"] = True
        config["vars"].update({"SECRET_KEY": signing_secret, "DB_PROBE_TOKEN": probe_secret})
        with worker_config.open("x", encoding="utf-8") as config_file:
            json.dump(config, config_file)
        with log_path.open("w", encoding="utf-8") as log, httpx.Client(timeout=60, follow_redirects=False) as client:
            try:
                print("Deploying a temporary, uniquely named DEV verification Worker...", flush=True)
                deployment_attempted = True
                process = subprocess.Popen([
                    sys.executable, "-m", "pywrangler", "deploy", "--config", str(worker_config),
                ], cwd=ROOT, env=environment, stdout=log, stderr=subprocess.STDOUT)
                if process.wait(timeout=240) != 0:
                    raise RuntimeError("The temporary development Worker deployment failed")
                deployment_succeeded = True
                log.flush()
                deployed_url = re.search(rf"https://{re.escape(worker_name)}\.[a-z0-9-]+\.workers\.dev",
                                         log_path.read_text(encoding="utf-8", errors="replace"))
                if deployed_url is None:
                    raise RuntimeError("Wrangler did not return the temporary development Worker URL")
                base_url = deployed_url.group()
                report["worker_name"] = worker_name
                wait_for_worker(base_url, client)

                def expect(name: str, method: str, path: str, *, headers=None, body=None) -> dict | list:
                    response = client.request(method, f"{base_url}{path}", headers=headers, json=body)
                    requests[name] = response.status_code
                    if response.status_code != 200:
                        raise RuntimeError(f"Development verification failed at {name}: HTTP {response.status_code}")
                    return response.json()

                print("Checking Neon transactions with a disposable fixture account...", flush=True)
                admin_headers = {"Authorization": f"Bearer {probe_secret}"}
                password_hash = bcrypt.hashpw(secrets.token_urlsafe(32).encode("ascii"), bcrypt.gensalt()).decode("ascii")
                fixture_attempted = True
                fixture = expect("prepare_fixture", "POST", "/api/internal/social-fixture",
                                 headers=admin_headers, body={"fixture_id": str(fixture_id), "password_hash": password_hash})
                report["baseline"] = fixture["baseline"]
                report["runtime"] = fixture["runtime"]
                catalogue_tables = {"movies", "persons", "genres", "collections", "movie_person", "movie_persons", "movie_genres"}
                if catalogue_tables.intersection(fixture["baseline"]):
                    raise RuntimeError("Expected the initialized fresh DEV target without catalogue tables")
                access_token = jwt.encode({"sub": fixture["email"], "exp": datetime.now(UTC) + timedelta(minutes=10)},
                                          signing_secret, algorithm="HS256")
                auth_headers = {"Authorization": f"Bearer {access_token}"}
                tmdb_movie_id = 550
                movie_path = f"/api/v1/movies/{tmdb_movie_id}"
                print("Checking comment, like, list, and unlike using the authenticated social API...", flush=True)
                comment = expect("post_comment", "POST", f"{movie_path}/comments", headers=auth_headers,
                                 body={"text": f"MovieGraph DEV verification {fixture_id}"})
                comments = expect("get_comments", "GET", f"{movie_path}/comments")
                if not any(row["comment_id"] == comment["comment_id"] and row["username"] == fixture["username"] for row in comments):
                    raise RuntimeError("The fixture comment identity was not preserved")
                expect("like", "POST", f"{movie_path}/like", headers=auth_headers)
                expect("duplicate_like", "POST", f"{movie_path}/like", headers=auth_headers)
                state = expect("liked_state", "GET", f"{movie_path}/like", headers=auth_headers)
                liked_ids = expect("liked_ids", "GET", "/api/v1/movies/likes", headers=auth_headers)
                if state != {"tmdb_movie_id": tmdb_movie_id, "liked": True} or liked_ids != [tmdb_movie_id]:
                    raise RuntimeError("The TMDB like relationship was not preserved")
                expect("unlike", "DELETE", f"{movie_path}/like", headers=auth_headers)
                expect("idempotent_unlike", "DELETE", f"{movie_path}/like", headers=auth_headers)
                state = expect("unliked_state", "GET", f"{movie_path}/like", headers=auth_headers)
                if state["liked"]:
                    raise RuntimeError("The fixture movie remained liked after unlike")
                if expect("empty_liked_ids", "GET", "/api/v1/movies/likes", headers=auth_headers) != []:
                    raise RuntimeError("The fixture like remained in the user list")
                report.update({"tmdb_movie_id": tmdb_movie_id, "fixture_user_id": fixture["user_id"],
                               "comment_id": comment["comment_id"], "catalogue_tables_created": False,
                               "comment_and_like_without_local_movie": "PASS", "requests": requests})
            except Exception:
                if not fixture_attempted:
                    log.flush()
                    excerpt = "\n".join(line for line in log_path.read_text(encoding="utf-8", errors="replace").splitlines()[-45:]
                                        if "env.SECRET_KEY" not in line and "env.DB_PROBE_TOKEN" not in line)
                    print(excerpt.replace(signing_secret, "[temporary key]").replace(probe_secret, "[temporary key]"), flush=True)
                raise
            finally:
                try:
                    if fixture_attempted:
                        print("Removing only the disposable account and its social rows...", flush=True)
                        cleanup = client.delete(f"{base_url}/api/internal/social-fixture/{fixture_id}",
                                                headers={"Authorization": f"Bearer {probe_secret}"})
                        if cleanup.status_code == 200:
                            report["after_cleanup"] = cleanup.json()["after"]
                            report.setdefault("runtime", {})["delete"] = cleanup.json()["delete"]
                            if fixture is not None and report["after_cleanup"] != fixture["baseline"]:
                                raise RuntimeError("Development baseline row counts changed after fixture cleanup")
                        else:
                            raise RuntimeError(f"Fixture cleanup failed for UUID {fixture_id}: HTTP {cleanup.status_code}")
                finally:
                    if process is not None:
                        stop_process_tree(process)
                    if deployment_attempted:
                        print("Removing the temporary verification Worker...", flush=True)
                        delete_args = ["npx", "--yes", "wrangler", "delete", "--config", str(worker_config), "--force"]
                        if os.name == "nt":
                            delete_args = ["cmd.exe", "/d", "/c", subprocess.list2cmdline([
                                "npx.cmd", "--yes", "wrangler", "delete", "--config", str(worker_config), "--force",
                            ])]
                        try:
                            deletion = subprocess.run(delete_args, cwd=ROOT, env=environment, capture_output=True,
                                                      text=True, encoding="utf-8", check=False)
                            report["temporary_worker_removed"] = deletion.returncode == 0
                            if deletion.returncode != 0:
                                deletion_output = deletion.stdout + deletion.stderr
                                missing_worker = any(value in deletion_output.lower() for value in ("10007", "10090", "not found", "does not exist"))
                                if deployment_succeeded or not missing_worker:
                                    print(f"Unable to confirm deletion of temporary Worker {worker_name}", flush=True)
                                    excerpt = "\n".join(deletion_output.splitlines()[-12:])
                                    print(excerpt.replace(signing_secret, "[temporary key]").replace(probe_secret, "[temporary key]"), flush=True)
                                    if deployment_succeeded:
                                        raise RuntimeError(f"Temporary Worker cleanup remains pending for {worker_name}")
                        finally:
                            worker_config.unlink()
            return report


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    try:
        report = run_verification()
    except Exception as error:
        if isinstance(error, RuntimeError):
            print(str(error), flush=True)
        else:
            print(f"Development verification stopped ({type(error).__name__}); credentials were not printed", flush=True)
        return 1
    print(json.dumps(report, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
