"""Verify the configured DEV Hyperdrive and social API using disposable rows."""

from datetime import datetime, timedelta, UTC
from concurrent.futures import ThreadPoolExecutor
import argparse
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
from uuid import UUID, uuid4

import bcrypt
import httpx
from jose import jwt

from local_processes import stop_process_tree


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "tools" / "diagnostics" / "wrangler.social-probe.jsonc"


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
    if (config.get("name") != "moviegraph-pre"
            or config.get("origin", {}).get("database") != "moviegraph"
            or not config.get("origin", {}).get("host", "").endswith(".neon.tech")
            or config.get("caching", {}).get("disabled") is not True):
        raise RuntimeError("Hyperdrive does not match MovieGraph PRE with caching disabled")
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


def run_verification(preview_url: str | None = None, verify_redeploy: bool = False,
                     cleanup_fixture_ids: tuple[UUID, ...] = ()) -> dict:
    previews = {
        f"https://{name}-moviegraph-app.romanoscense10.workers.dev": name
        for name in ("dev", "staging")
    }
    if preview_url is not None and preview_url not in previews:
        raise RuntimeError("Remote application checks are restricted to the dev and staging PRE previews")
    if verify_redeploy and preview_url is None:
        raise RuntimeError("Redeployment verification requires an explicitly selected PRE preview")
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
    registration_id = uuid4()
    fixture_ids = [fixture_id]
    worker_name = f"moviegraph-probe-dev-{fixture_id.hex}"
    report = {"target": f"{previews[preview_url]}-preview" if preview_url else "neon-pre-verification",
              "hyperdrive": hyperdrive, "fixture_id": str(fixture_id)}
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
        config["main"] = str((CONFIG.parent / config["main"]).resolve())
        config["base_dir"] = str((CONFIG.parent / config["base_dir"]).resolve())
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
                    report["requests"] = requests
                    if response.status_code != 200:
                        cloudflare_error = re.search(r"error code:\s*(\d+)", response.text)
                        reason = f" (Cloudflare {cloudflare_error.group(1)})" if cloudflare_error else ""
                        raise RuntimeError(f"Development verification failed at {name}: HTTP {response.status_code}{reason}")
                    return response.json()

                print("Checking Neon transactions with a disposable fixture account...", flush=True)
                admin_headers = {"Authorization": f"Bearer {probe_secret}"}
                for cleanup_id in cleanup_fixture_ids:
                    cleanup_result = expect("cleanup_previous_fixture", "DELETE", f"/api/internal/social-fixture/{cleanup_id}",
                                            headers=admin_headers)
                    report["after_cleanup"] = cleanup_result["after"]
                if cleanup_fixture_ids:
                    report["previous_fixtures_removed"] = [str(cleanup_id) for cleanup_id in cleanup_fixture_ids]
                    if preview_url is None:
                        return report
                fixture_password = secrets.token_urlsafe(32)
                password_hash = bcrypt.hashpw(fixture_password.encode("ascii"), bcrypt.gensalt()).decode("ascii")
                fixture_attempted = True
                fixture = expect("prepare_fixture", "POST", "/api/internal/social-fixture",
                                 headers=admin_headers, body={"fixture_id": str(fixture_id), "password_hash": password_hash})
                report["baseline"] = fixture["baseline"]
                report["runtime"] = fixture["runtime"]
                report["revision"] = fixture["revision"]
                report["password_crypto_available"] = fixture["password_crypto_available"]
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
                if preview_url is not None:
                    print("Checking registration, login, follows, comments and likes on the PRE preview...", flush=True)
                    preview_checks = []

                    def preview_request(label, method, path, *, expected=200, **kwargs):
                        started_at = datetime.now(UTC).isoformat()
                        started = time.monotonic()
                        response = client.request(method, preview_url + path, **kwargs)
                        preview_checks.append({"operation": label, "method": method, "path": path,
                                               "status": response.status_code, "started_at": started_at,
                                               "ended_at": datetime.now(UTC).isoformat(),
                                               "wall_ms": round((time.monotonic() - started) * 1000, 2)})
                        if response.status_code != expected:
                            try:
                                detail = response.json().get("detail")
                            except (ValueError, AttributeError):
                                detail = None
                            safe_details = {"Login protection is unavailable", "Login protection is not configured",
                                            "Database unavailable or not configured", "Authentication is not configured",
                                            "Invalid credentials", "Account could not be created",
                                            "Database is busy. Try again shortly."}
                            cloudflare_error = re.search(r"error code:\s*(\d+)", response.text)
                            preview_checks[-1]["cf_ray"] = response.headers.get("cf-ray")
                            if cloudflare_error:
                                preview_checks[-1]["cloudflare_error_code"] = cloudflare_error.group(1)
                            if isinstance(detail, str) and detail in safe_details:
                                preview_checks[-1]["error_detail"] = detail
                            reason = f" ({detail})" if isinstance(detail, str) and detail in safe_details else ""
                            if cloudflare_error:
                                reason += f" (Cloudflare {cloudflare_error.group(1)})"
                            raise RuntimeError(f"PRE preview {label}: expected {expected}, got {response.status_code}{reason}")
                        return response.json()

                    report["preview_url"] = preview_url
                    report["preview_checks"] = preview_checks
                    preview_request("unauthenticated_profile", "GET", "/api/v1/users/me", expected=401)
                    preview_request("unauthenticated_like", "POST", movie_path + "/like", expected=401)
                    registration_username = f"probe-{registration_id.hex}"
                    registration_email = f"{registration_username}@example.com"
                    registration_password = secrets.token_urlsafe(32)
                    fixture_ids.append(registration_id)
                    registration = {"username": registration_username, "email": registration_email,
                                    "password": registration_password, "birthdate": "1990-01-01",
                                    "bio": "Disposable backend verification", "favorite_genres": ["Drama"]}
                    preview_request("registration", "POST", "/api/v1/users/", expected=201, json=registration)
                    preview_request("duplicate_registration", "POST", "/api/v1/users/", expected=409, json=registration)
                    preview_request("wrong_password", "POST", "/api/v1/users/login", expected=401,
                                    data={"username": registration_email, "password": "wrong-password"})
                    login = preview_request("login", "POST", "/api/v1/users/login",
                                            data={"username": registration_email, "password": registration_password})
                    own_headers = {"Authorization": "Bearer " + login["access_token"]}
                    profile = preview_request("profile", "GET", "/api/v1/users/me", headers=own_headers)
                    if profile["email"] != registration_email or profile["favorite_genres"] != ["Drama"]:
                        raise RuntimeError("dev profile/preference round-trip failed")
                    if verify_redeploy:
                        print("Checking session and secret preservation across a preview redeployment...", flush=True)
                        redeploy = subprocess.run([
                            sys.executable, "-m", "pywrangler", "preview", "--config", "wrangler.jsonc",
                            "--worker-name", "moviegraph-app", "--name", previews[preview_url],
                        ], cwd=ROOT, env=environment, stdout=log, stderr=subprocess.STDOUT, timeout=240)
                        if redeploy.returncode != 0:
                            raise RuntimeError("PRE preview redeployment failed; the previous deployment remains selected")
                        preview_request("profile_after_redeploy", "GET", "/api/v1/users/me", headers=own_headers)
                        report["session_survives_redeploy"] = "PASS"
                    follow_path = "/api/v1/follows/"
                    concurrent_paths = (
                        "/api/v1/users/me",
                        "/api/v1/movies/likes",
                        follow_path + "following",
                        follow_path + "followers",
                        follow_path + f"users/{profile['public_id']}",
                    )
                    for batch in range(3):
                        with ThreadPoolExecutor(max_workers=len(concurrent_paths)) as executor:
                            pending = [
                                executor.submit(preview_request, f"concurrent_{batch}_{index}", "GET", path,
                                                headers=own_headers)
                                for index, path in enumerate(concurrent_paths)
                            ]
                            for request in pending:
                                request.result()
                    report["concurrent_authenticated_reads"] = "PASS"
                    catalogue_paths = (
                        "/api/tmdb/movies/featured?limit=5",
                        "/api/tmdb/movies?kind=latest&page=1&limit=10",
                        "/api/tmdb/movies?kind=top-rated&page=1&limit=10",
                        "/api/tmdb/collections?random_one=true",
                        "/api/tmdb/people/featured",
                    )
                    interrupted_requests = 0
                    for batch in range(3):
                        print(f"Checking interrupted authenticated page load {batch + 1}/3...", flush=True)
                        with ThreadPoolExecutor(max_workers=10) as executor:
                            interrupted = [executor.submit(
                                client.get, preview_url + path, headers=own_headers, timeout=0.15,
                            ) for path in concurrent_paths]
                            catalogue = [executor.submit(
                                preview_request, f"catalogue_during_interrupt_{batch}_{index}", "GET", path,
                            ) for index, path in enumerate(catalogue_paths)]
                            for pending_request in interrupted:
                                try:
                                    response = pending_request.result()
                                except httpx.TimeoutException:
                                    interrupted_requests += 1
                                else:
                                    if response.status_code != 200:
                                        raise RuntimeError(f"Interrupted page load returned HTTP {response.status_code}")
                            for pending_request in catalogue:
                                pending_request.result()
                        for index, path in enumerate(concurrent_paths):
                            preview_request(f"recovery_after_interrupt_{batch}_{index}", "GET", path,
                                            headers=own_headers)
                    if interrupted_requests == 0:
                        raise RuntimeError("Cancellation verification did not interrupt any requests")
                    report["interrupted_authenticated_requests"] = interrupted_requests
                    report["recovery_after_interrupted_page_loads"] = "PASS"
                    try:
                        friend_login = preview_request("friend_login", "POST", "/api/v1/users/login",
                                                       data={"username": fixture["email"], "password": fixture_password})
                    except RuntimeError:
                        for path in ("/api/v1/users/me", "/api/v1/movies/likes",
                                     "/api/v1/follows/following", "/api/v1/follows/followers"):
                            preview_request("recovery_after_failed_login", "GET", path, headers=own_headers)
                        report["recovery_after_failed_login"] = "PASS"
                        raise
                    friend_headers = {"Authorization": "Bearer " + friend_login["access_token"]}
                    friend = preview_request("friend_profile", "GET", "/api/v1/users/me", headers=friend_headers)
                    follow_path = "/api/v1/follows/"
                    follow_body = {"public_id": friend["public_id"]}
                    for label in ("follow", "duplicate_follow"):
                        preview_request(label, "POST", follow_path, json=follow_body, headers=own_headers)
                    following = preview_request("following", "GET", follow_path + "following", headers=own_headers)
                    if [user["public_id"] for user in following] != [friend["public_id"]]:
                        raise RuntimeError("dev follow identity mismatch")
                    preview_request("friend_like", "POST", movie_path + "/like", headers=friend_headers)
                    if preview_request("followed_likes", "GET", follow_path + "movie-likes", headers=own_headers) != [550]:
                        raise RuntimeError("dev followed-user likes mismatch")
                    saved = preview_request("comment", "POST", movie_path + "/comments", headers=own_headers,
                                            json={"text": "Disposable dev verification " + str(registration_id)})
                    listed = preview_request("comments", "GET", movie_path + "/comments")
                    if not any(row["comment_id"] == saved["comment_id"] and row["username"] == registration_username for row in listed):
                        raise RuntimeError("dev comment readback mismatch")
                    for label in ("like", "duplicate_like"):
                        preview_request(label, "POST", movie_path + "/like", headers=own_headers)
                    if preview_request("like_state", "GET", movie_path + "/like", headers=own_headers)["liked"] is not True:
                        raise RuntimeError("dev like state mismatch")
                    if preview_request("liked_ids", "GET", "/api/v1/movies/likes", headers=own_headers) != [550]:
                        raise RuntimeError("dev liked IDs mismatch")
                    for label in ("unlike", "duplicate_unlike"):
                        preview_request(label, "DELETE", movie_path + "/like", headers=own_headers)
                    if preview_request("empty_liked_ids", "GET", "/api/v1/movies/likes", headers=own_headers) != []:
                        raise RuntimeError("dev unlike failed")
                    for label in ("unfollow", "duplicate_unfollow"):
                        preview_request(label, "DELETE", follow_path, json=follow_body, headers=own_headers)
                    if preview_request("empty_following", "GET", follow_path + "following", headers=own_headers) != []:
                        raise RuntimeError("dev unfollow failed")
                    preview_request("profile_after_concurrency", "GET", "/api/v1/users/me", headers=own_headers)
                    report["preview_behaviour"] = "PASS"
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
                        report["pending_fixture_cleanup"] = [str(cleanup_id) for cleanup_id in fixture_ids]
                        for cleanup_id in reversed(fixture_ids):
                            cleanup = client.delete(f"{base_url}/api/internal/social-fixture/{cleanup_id}",
                                                    headers={"Authorization": f"Bearer {probe_secret}"})
                            if cleanup.status_code != 200:
                                raise RuntimeError(f"Fixture cleanup failed for UUID {cleanup_id}: HTTP {cleanup.status_code}")
                            report["after_cleanup"] = cleanup.json()["after"]
                            report.setdefault("runtime", {})["delete"] = cleanup.json()["delete"]
                            report["pending_fixture_cleanup"].remove(str(cleanup_id))
                        if fixture is not None and report["after_cleanup"] != fixture["baseline"]:
                            raise RuntimeError("Development baseline row counts changed after fixture cleanup")
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
                            output_directory = ROOT / "output"
                            output_directory.mkdir(exist_ok=True)
                            (output_directory / "backend-dev-verification.json").write_text(
                                json.dumps(report, indent=2), encoding="utf-8",
                            )
            return report


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preview-url", help="Exercise the dev or staging PRE preview using disposable accounts")
    parser.add_argument("--verify-redeploy", action="store_true", help="Verify existing JWTs survive redeployment of the selected PRE preview")
    parser.add_argument("--cleanup-fixture", action="append", type=UUID, default=[], help="Remove only a known disposable fixture UUID left by an interrupted PRE verification")
    arguments = parser.parse_args()
    try:
        report = run_verification(arguments.preview_url, arguments.verify_redeploy, tuple(arguments.cleanup_fixture))
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
