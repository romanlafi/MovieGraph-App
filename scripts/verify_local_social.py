from datetime import datetime, timedelta, timezone
import argparse
import json
import secrets
import sys
from uuid import uuid4

import bcrypt
import httpx
from jose import jwt
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

from run_local import (LOCAL_WORKER_SECRETS, check_local_schema, dotenv_values,
                       local_database_url, read_local_password)


def verify(worker_port: int = 8787) -> dict:
    if not 1 <= worker_port <= 65535:
        raise RuntimeError("Invalid local Worker port")
    database_url = local_database_url(read_local_password())
    inventory = check_local_schema(database_url)
    if set(inventory["tables"]) & {"movies", "persons", "genres", "collections", "movie_person", "movie_persons", "movie_genres"}:
        raise RuntimeError("The local verification requires the social-only schema, not a legacy catalogue database")
    signing_key = dotenv_values(LOCAL_WORKER_SECRETS, interpolate=False).get("SECRET_KEY")
    if not signing_key:
        raise RuntimeError("Run MovieGraph Setup Local DB first")
    engine = create_engine(database_url, poolclass=NullPool, hide_parameters=True,
                           connect_args={"timeout": 10})
    tables = ("users", "comments", "user_movie_likes")
    fixture_id = uuid4().hex
    email = f"local-verification-{fixture_id}@example.invalid"
    username = f"local-verification-{fixture_id}"
    user_id = None
    baseline = {}
    try:
        with engine.connect() as connection:
            baseline = {table: connection.execute(text(f"SELECT count(*) FROM {table}")).scalar_one() for table in tables}
        with httpx.Client(base_url=f"http://127.0.0.1:{worker_port}", timeout=20) as client:
            if client.get("/api/v1/movies/550/like").status_code != 401:
                raise RuntimeError("Local Worker must enforce authentication; run MovieGraph Local")
            with engine.begin() as connection:
                user_id = connection.execute(text(
                    "INSERT INTO users(email, username, password) VALUES (:email, :username, :password) RETURNING id"
                ), {"email": email, "username": username,
                    "password": bcrypt.hashpw(secrets.token_bytes(32), bcrypt.gensalt()).decode()}).scalar_one()
            token = jwt.encode({"sub": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=5)},
                               signing_key, algorithm="HS256")
            client.headers["Authorization"] = f"Bearer {token}"
            statuses = {}

            def request(label: str, method: str, path: str, **kwargs):
                response = client.request(method, path, **kwargs)
                statuses[label] = response.status_code
                if response.status_code != 200:
                    raise RuntimeError(f"Local verification failed: {label}, HTTP {response.status_code}")
                return response.json()

            comment = request("comment", "POST", "/api/v1/movies/550/comments", json={"text": f"Local fixture {fixture_id}"})
            comments = request("read_comments", "GET", "/api/v1/movies/550/comments")
            if comment["username"] != username or not any(row["comment_id"] == comment["comment_id"] for row in comments):
                raise RuntimeError("Comment identity/readback mismatch")
            with engine.connect() as connection:
                persisted = connection.execute(text(
                    "SELECT user_id, tmdb_movie_id, text FROM comments WHERE id=:id"
                ), {"id": comment["comment_id"]}).one()
                if tuple(persisted) != (user_id, 550, f"Local fixture {fixture_id}"):
                    raise RuntimeError("Persisted comment identity mismatch")
            request("like", "POST", "/api/v1/movies/550/like")
            request("duplicate_like", "POST", "/api/v1/movies/550/like")
            state = request("liked_state", "GET", "/api/v1/movies/550/like")
            likes = request("liked_ids", "GET", "/api/v1/movies/likes")
            if state != {"tmdb_movie_id": 550, "liked": True} or likes != [550]:
                raise RuntimeError("Like state mismatch")
            request("unlike", "DELETE", "/api/v1/movies/550/like")
            request("repeat_unlike", "DELETE", "/api/v1/movies/550/like")
            if request("unliked_state", "GET", "/api/v1/movies/550/like") != {"tmdb_movie_id": 550, "liked": False}:
                raise RuntimeError("Unlike state mismatch")
            if request("empty_likes", "GET", "/api/v1/movies/likes") != []:
                raise RuntimeError("Unlike list mismatch")
        result = {"target": "local-development", "requests": statuses}
    finally:
        try:
            if user_id is not None:
                with engine.begin() as connection:
                    parameters = {"user_id": user_id, "email": email, "username": username}
                    for table in ("comments", "user_movie_likes"):
                        connection.execute(text(f"DELETE FROM {table} WHERE user_id IN ("
                                                "SELECT id FROM users WHERE id=:user_id AND email=:email AND username=:username)"), parameters)
                    connection.execute(text("DELETE FROM users WHERE id=:user_id AND email=:email AND username=:username"), parameters)
            with engine.connect() as connection:
                after = {table: connection.execute(text(f"SELECT count(*) FROM {table}")).scalar_one() for table in tables}
            if baseline and after != baseline:
                raise RuntimeError("Local baseline changed after fixture cleanup; inspect concurrent writes")
        finally:
            engine.dispose()
    result.update({"baseline": baseline, "after_cleanup": after, "catalogue_tables": "absent"})
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verify authenticated social operations against the isolated local database")
    parser.add_argument("--port", type=int, default=8787)
    arguments = parser.parse_args()
    try:
        print(json.dumps(verify(arguments.port), indent=2))
    except Exception as error:
        print(str(error) if isinstance(error, RuntimeError) else f"Local verification failed ({type(error).__name__}); credentials hidden")
        sys.exit(1)
