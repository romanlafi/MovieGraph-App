"""Foundation checks without a database connection or real credentials."""

import json
import os
from pathlib import Path
import subprocess
import sys
import unittest


BACK = Path(__file__).resolve().parents[1]
CONFIG_KEYS = (
    "SECRET_KEY", "TMDB_API_KEY", "DATABASE_URL", "APP_ENV",
    "CORS_ORIGINS", "ACCESS_TOKEN_EXPIRE_MINUTES", "JWT_ALGORITHM",
)
LOCAL_CONFIG = {
    "SECRET_KEY": "test-placeholder",
    "TMDB_API_KEY": "test-placeholder",
    "DATABASE_URL": "postgresql://test:test@127.0.0.1:5432/test",
}


def isolated(code: str, values: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    env = {key: value for key, value in os.environ.items() if key not in CONFIG_KEYS}
    env["PYTHONPATH"] = str(BACK)
    env.update(values or {})
    return subprocess.run(
        [sys.executable, "-c", code], cwd=BACK, env=env,
        text=True, capture_output=True, check=False,
    )


class FoundationTests(unittest.TestCase):
    def test_shell_liveness_without_legacy_imports_or_credentials(self):
        result = isolated("""
import sys
from fastapi.testclient import TestClient
from app.application import create_app
with TestClient(create_app(include_legacy_api=False)) as client:
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}
    assert client.get('/api/nonexistent').status_code == 404
assert 'app.db.database' not in sys.modules
assert 'app.core.config' not in sys.modules
assert 'app.services.tmdb_service' not in sys.modules
""")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_legacy_routes_and_auth_validation_remain_available(self):
        result = isolated("""
from fastapi.testclient import TestClient
from app.main import app
routes = [r for r in app.routes if r.path.startswith('/api/v1')]
assert sum(len(r.methods - {'HEAD', 'OPTIONS'}) for r in routes) == 41
with TestClient(app) as client:
    assert client.get('/api/health').json() == {'status': 'ok'}
    assert client.get('/api/v1/users/me').status_code == 401
    assert client.post('/api/v1/users/login', data={}).status_code == 422
    assert client.get('/api/v1/movies/tmdb_search', params={'query': 'a'}).status_code == 422
""", LOCAL_CONFIG)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_missing_config_names_value_without_exposing_secrets(self):
        # DB is now request-time; test_db_runtime covers absent DATABASE_URL.
        for key in ("SECRET_KEY", "TMDB_API_KEY"):
            with self.subTest(key=key):
                values = {k: v for k, v in LOCAL_CONFIG.items() if k != key}
                result = isolated("import app.core.config", values)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(f"Missing required backend configuration: {key}", result.stderr)
                self.assertNotIn("test-placeholder", result.stderr)

    def test_invalid_token_duration_fails_clearly(self):
        for duration in ("bad", "0", "-1"):
            with self.subTest(duration=duration):
                result = isolated("import app.core.config", {
                    **LOCAL_CONFIG, "ACCESS_TOKEN_EXPIRE_MINUTES": duration,
                })
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("must be a positive integer", result.stderr)

    def test_production_has_no_cors_by_default(self):
        result = isolated("""
import json
from app.core.config import CORS_ORIGINS
print(json.dumps(CORS_ORIGINS))
""", {**LOCAL_CONFIG, "APP_ENV": "production"})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), [])

    def test_cors_allows_only_configured_local_origin(self):
        result = isolated("""
from fastapi.testclient import TestClient
from app.main import app
with TestClient(app) as client:
    allowed = client.options('/api/health', headers={
        'Origin': 'http://localhost:5173', 'Access-Control-Request-Method': 'GET',
    })
    assert allowed.status_code == 200
    assert allowed.headers['access-control-allow-origin'] == 'http://localhost:5173'
    denied = client.options('/api/health', headers={
        'Origin': 'https://unlisted.example', 'Access-Control-Request-Method': 'GET',
    })
    assert denied.status_code == 400
    assert 'access-control-allow-origin' not in denied.headers
""", LOCAL_CONFIG)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_wildcard_cors_is_rejected(self):
        result = isolated("import app.core.config", {**LOCAL_CONFIG, "CORS_ORIGINS": "*"})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("explicit HTTP(S) origins", result.stderr)


if __name__ == "__main__":
    unittest.main()
