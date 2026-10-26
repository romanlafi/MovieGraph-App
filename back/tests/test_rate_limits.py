"""Admission rejects abusive requests before database or catalogue dependencies."""

import asyncio
import json
from pathlib import Path
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch

from fastapi import Depends
from fastapi.testclient import TestClient

from app.application import create_app
from app.core.rate_limits import APIProtectionMiddleware, MAX_BODY_BYTES, check_limit
from app.social.dependencies import get_social_session


BINDINGS = {
    "API_IP_RATE_LIMITER": 180, "SOCIAL_IP_RATE_LIMITER": 60,
    "WRITE_IP_RATE_LIMITER": 20, "REGISTER_IP_RATE_LIMITER": 3,
    "SOCIAL_GLOBAL_RATE_LIMITER": 20, "REGISTER_GLOBAL_RATE_LIMITER": 2,
    "CATALOGUE_IP_RATE_LIMITER": 120,
}


class Limiter:
    def __init__(self, limit=10_000):
        self.limit_count = limit
        self.keys = []

    async def limit(self, options):
        key = options["key"]
        self.keys.append(key)
        return SimpleNamespace(success=self.keys.count(key) <= self.limit_count)


class RateLimitTests(unittest.TestCase):
    def setUp(self):
        self.env = {"APP_ENV": "production", **{name: Limiter() for name in BINDINGS}}
        self.app = create_app(include_social_api=True, include_account_api=True, include_follows_api=True)

        @self.app.middleware("http")
        async def bindings(request, call_next):
            request.scope["env"] = self.env
            return await call_next(request)

        self.database = Mock(side_effect=AssertionError("Database must not open"))
        self.app.dependency_overrides[get_social_session] = self.database
        self.client = TestClient(self.app)
        self.addCleanup(self.client.close)

    def test_every_api_route_is_blocked_before_dependencies(self):
        self.env["API_IP_RATE_LIMITER"] = Limiter(0)
        for route in self.app.routes:
            if not getattr(route, "path", "").startswith("/api"):
                continue
            path = route.path.replace("{tmdb_movie_id}", "550").replace("{tmdb_person_id}", "287")
            path = path.replace("{tmdb_collection_id}", "10").replace("{public_id}", "invalid")
            for method in route.methods:
                with self.subTest(path=path, method=method):
                    response = self.client.request(method, path)
                    self.assertEqual(response.status_code, 429)
                    self.assertEqual(response.headers["retry-after"], "60")
                    self.assertEqual(response.headers["cache-control"], "no-store")
        self.database.assert_not_called()

    def test_social_budget_is_shared_across_paths_methods_and_tokens(self):
        self.env["SOCIAL_IP_RATE_LIMITER"] = Limiter(1)
        self.assertEqual(self.client.get("/api/v1/missing").status_code, 404)
        for path in ("/api/v1/movies/550/comments", "/api/v1/users/me", "/api/v1/follows/list"):
            response = self.client.post(path, headers={"Authorization": "Bearer rotating"})
            self.assertEqual(response.status_code, 429)
        self.database.assert_not_called()

    def test_forwarded_headers_do_not_reset_ip_quota(self):
        self.env["API_IP_RATE_LIMITER"] = Limiter(1)
        for index, expected in enumerate((200, 429, 429)):
            response = self.client.get("/api/health", headers={
                "cf-connecting-ip": "192.0.2.1", "X-Forwarded-For": f"192.0.2.{index + 2}",
            })
            self.assertEqual(response.status_code, expected)
        self.assertNotIn("192.0.2.1", self.env["API_IP_RATE_LIMITER"].keys[0])
        self.assertEqual(self.client.get("/api/health", headers={"cf-connecting-ip": "192.0.2.99"}).status_code, 200)

    def test_global_social_breaker_survives_ip_rotation_and_leaves_catalogue_available(self):
        self.env["SOCIAL_GLOBAL_RATE_LIMITER"] = Limiter(1)
        self.assertEqual(self.client.get("/api/v1/missing").status_code, 404)
        self.assertEqual(self.client.get("/api/v1/movies/550/comments", headers={
            "cf-connecting-ip": "192.0.2.99",
        }).status_code, 429)
        self.assertEqual(self.client.get("/api/health").status_code, 200)
        self.database.assert_not_called()

    def test_registration_write_and_catalogue_limits_are_enforced(self):
        cases = (("REGISTER_IP_RATE_LIMITER", "POST", "/api/v1/users/"),
                 ("REGISTER_GLOBAL_RATE_LIMITER", "POST", "/api/v1/users/"),
                 ("WRITE_IP_RATE_LIMITER", "DELETE", "/api/v1/movies/550/like"),
                 ("CATALOGUE_IP_RATE_LIMITER", "GET", "/api/tmdb/movie/550"))
        for name, method, path in cases:
            with self.subTest(name=name):
                self.env[name] = Limiter(0)
                self.assertEqual(self.client.request(method, path).status_code, 429)
                self.env[name] = Limiter()
        self.database.assert_not_called()

    def test_missing_and_broken_bindings_fail_closed(self):
        self.env.pop("API_IP_RATE_LIMITER")
        self.assertEqual(self.client.get("/api/health").status_code, 503)
        self.env["API_IP_RATE_LIMITER"] = SimpleNamespace(limit=AsyncMock(side_effect=RuntimeError("secret")))
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("secret", response.text)
        self.database.assert_not_called()

    def test_body_and_query_limits_precede_database_access(self):
        self.assertEqual(self.client.post("/api/v1/users/", content=b"x" * (MAX_BODY_BYTES + 1)).status_code, 413)
        self.assertEqual(self.client.get("/api/v1/movies/550/comments?x=" + "a" * 2049).status_code, 414)
        self.assertEqual(self.client.post("/api/v1/users/", headers={"content-length": "bad"}).status_code, 400)
        self.database.assert_not_called()

    def test_chunked_oversize_body_never_reaches_app(self):
        downstream = AsyncMock()
        middleware = APIProtectionMiddleware(downstream)
        receive = AsyncMock(side_effect=[
            {"type": "http.request", "body": b"x" * MAX_BODY_BYTES, "more_body": True},
            {"type": "http.request", "body": b"x", "more_body": False},
        ])
        send = AsyncMock()
        scope = {"type": "http", "method": "POST", "path": "/api/v1/users/", "headers": [],
                 "query_string": b"", "env": self.env}
        asyncio.run(middleware(scope, receive, send))
        self.assertEqual(send.await_args_list[0].args[0]["status"], 413)
        downstream.assert_not_called()

    def test_local_requests_work_without_remote_bindings(self):
        with TestClient(create_app()) as client:
            self.assertEqual(client.get("/api/health").status_code, 200)

    def test_javascript_binding_receives_plain_object(self):
        converted = object()
        js = ModuleType("js")
        js.Object = SimpleNamespace(fromEntries=object())
        ffi = ModuleType("pyodide.ffi")
        ffi.to_js = Mock(return_value=converted)
        limiter = SimpleNamespace(limit=AsyncMock(return_value=SimpleNamespace(success=True)))
        with patch("app.core.rate_limits.sys.platform", "emscripten"), patch.dict("sys.modules", {
            "js": js, "pyodide.ffi": ffi,
        }):
            asyncio.run(check_limit({"TEST": limiter}, "TEST", "hashed-key"))
        limiter.limit.assert_awaited_once_with(converted)
        ffi.to_js.assert_called_once_with({"key": "hashed-key"}, dict_converter=js.Object.fromEntries)

    def test_production_and_preview_namespaces_are_independent(self):
        config = json.loads((Path(__file__).resolve().parents[2] / "wrangler.jsonc").read_text())
        namespaces = []
        for target in (config, config["previews"]):
            limits = {item["name"]: item for item in target["ratelimits"]}
            for name, limit in BINDINGS.items():
                self.assertEqual(limits[name]["simple"], {"limit": limit, "period": 60})
                namespaces.append(limits[name]["namespace_id"])
        self.assertEqual(len(namespaces), len(set(namespaces)))
