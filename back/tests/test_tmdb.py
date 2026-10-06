"""Deterministic gateway tests; no PostgreSQL or live TMDB required."""

import asyncio
import json
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

import httpx
from fastapi.testclient import TestClient

from app.application import create_app
from app.catalogue.client import (
    TMDBClient, TMDBError, TMDBSettings, local_get, worker_get,
)
from app.catalogue.routes import get_tmdb_client
from test_foundation import isolated


MOVIE = {"id": 348, "title": "Alien", "release_date": "1979-05-25",
         "vote_average": 8.2, "poster_path": "/alien.jpg", "overview": "In space"}
PERSON = {"id": 578, "name": "Ridley Scott", "biography": "Director"}


class TMDBTests(unittest.TestCase):
    def setUp(self):
        self.transport = AsyncMock(return_value=(200, json.dumps({"results": [MOVIE]})))
        self.gateway = TMDBClient(TMDBSettings(api_key="private-key"), self.transport)
        self.app = create_app(include_legacy_api=False)
        self.app.dependency_overrides[get_tmdb_client] = lambda: self.gateway
        self.client = TestClient(self.app)

    def test_search_contract_filters_pagination_and_auth(self):
        self.transport.return_value = (200, json.dumps({"results": [
            {**MOVIE, "poster_path": None}, {**MOVIE, "vote_average": 0},
            {**MOVIE, "overview": None}, *[MOVIE] * 8,
        ], "api_key": "private-key"}))
        response = self.client.get("/api/tmdb/search/movie", params={"q": " alien ", "page": 2})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 5)
        self.assertEqual(response.json()[0], {"tmdb_id": 348, "title": "Alien",
                         "rating": 8.2, "year": 1979, "poster_url": "/alien.jpg"})
        self.assertNotIn("private-key", response.text)
        url, headers, timeout = self.transport.call_args.args
        self.assertIn("query=alien", url)
        self.assertIn("page=2", url)
        self.assertIn("include_adult=false", url)
        self.assertIn("api_key=private-key", url)
        self.assertEqual(timeout, 10.0)

    def test_invalid_inputs_never_contact_tmdb(self):
        for params in ({}, {"q": ""}, {"q": "a"}, {"q": "  "}, {"q": "x" * 201},
                       {"q": "alien", "page": 0}, {"q": "alien", "page": 501}):
            with self.subTest(params=params):
                self.assertEqual(self.client.get("/api/tmdb/search/movie", params=params).status_code, 422)
        for path in ("movie/0", "movie/-1", "person/0", "person/no"):
            self.assertEqual(self.client.get(f"/api/tmdb/{path}").status_code, 422)
        self.transport.assert_not_called()

    def test_movie_and_person_details_have_only_tmdb_identity(self):
        for resource, data in (("movie", MOVIE), ("person", PERSON)):
            with self.subTest(resource=resource):
                self.transport.reset_mock()
                self.transport.return_value = (200, json.dumps({**data, "api_key": "private-key"}))
                response = self.client.get(f"/api/tmdb/{resource}/{data['id']}")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["tmdb_id"], data["id"])
                self.assertNotIn("id", response.json())
                self.assertNotIn("private-key", response.text)
                self.assertIn(f"/{resource}/{data['id']}?", self.transport.call_args.args[0])
                self.transport.assert_awaited_once()

    def test_upstream_failures_are_sanitized_for_every_route(self):
        for path in ("search/movie?q=alien", "movie/348", "person/578"):
            for upstream, expected in ((301, 502), (302, 502), (404, 404), (401, 502), (403, 502), (429, 503), (500, 502)):
                with self.subTest(path=path, upstream=upstream):
                    self.transport.return_value = (upstream, "private-key and upstream internals")
                    response = self.client.get(f"/api/tmdb/{path}")
                    self.assertEqual(response.status_code, expected)
                    self.assertNotIn("private-key", response.text)

    def test_invalid_upstream_payloads(self):
        for body in ("not JSON", "[]", "{}", '{"results":null}', '{"results":[null]}'):
            self.transport.return_value = (200, body)
            self.assertEqual(self.client.get("/api/tmdb/search/movie?q=alien").status_code, 502)
        self.transport.return_value = (200, json.dumps({**MOVIE, "id": 999}))
        self.assertEqual(self.client.get("/api/tmdb/movie/348").status_code, 502)

    def test_missing_credentials_leave_health_available(self):
        app = create_app(include_legacy_api=False)
        with patch.dict("os.environ", {}, clear=True), TestClient(app) as client:
            self.assertEqual(client.get("/api/health").status_code, 200)
            self.assertEqual(client.get("/api/tmdb/search/movie?q=alien").status_code, 503)
            self.assertEqual(client.get("/api/v1/users/me").status_code, 404)

    def test_request_binding_and_read_token_auth(self):
        settings = TMDBSettings.from_env(SimpleNamespace(TMDB_READ_ACCESS_TOKEN="private-token"))
        transport = AsyncMock(return_value=(200, json.dumps(MOVIE)))
        asyncio.run(TMDBClient(settings, transport).movie_detail(348))
        url, headers, _ = transport.call_args.args
        self.assertNotIn("api_key", url)
        self.assertEqual(headers["Authorization"], "Bearer private-token")
        self.assertNotIn("private-token", repr(settings))

    def test_local_async_http_transport_and_failures(self):
        async def check():
            for error, expected in ((httpx.ReadTimeout("private-key"), 504),
                                    (httpx.ConnectError("private-key"), 502)):
                with patch("httpx.AsyncClient.get", new=AsyncMock(side_effect=error)):
                    with self.assertRaises(TMDBError) as caught:
                        await local_get("https://example.test", {}, 10)
                    self.assertEqual(caught.exception.status_code, expected)
                    self.assertNotIn("private-key", str(caught.exception))
            with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=httpx.Response(200, text="{}"))):
                self.assertEqual(await local_get("https://example.test", {}, 10), (200, "{}"))
        asyncio.run(check())

    def test_worker_fetch_timeout_abort_and_transport_errors(self):
        async def check():
            controller = SimpleNamespace(signal=object(), abort=unittest.mock.Mock())
            fetch = AsyncMock(return_value=SimpleNamespace(status=200, text=AsyncMock(return_value="{}")))
            with patch.dict("sys.modules", {
                "js": SimpleNamespace(AbortController=SimpleNamespace(new=lambda: controller)),
                "workers": SimpleNamespace(fetch=fetch),
            }):
                self.assertEqual(await worker_get("https://example.test", {}, 10), (200, "{}"))
                controller.abort.assert_called_once()
                self.assertIs(fetch.call_args.kwargs["signal"], controller.signal)
                self.assertEqual(fetch.call_args.kwargs["redirect"], "manual")
                fetch.side_effect = OSError("private-key")
                with self.assertRaises(TMDBError) as caught:
                    await worker_get("https://example.test", {}, 10)
                self.assertEqual(caught.exception.status_code, 502)
                async def slow(*args, **kwargs):
                    await asyncio.sleep(1)
                fetch.side_effect = slow
                with self.assertRaises(TMDBError) as caught:
                    await worker_get("https://example.test", {}, 0.001)
                self.assertEqual(caught.exception.status_code, 504)
                self.assertEqual(controller.abort.call_count, 3)
        asyncio.run(check())

    def test_all_routes_with_legacy_imports_forbidden(self):
        # A new interpreter with no DATABASE_URL. Import blockers prove there is
        # no route to sessions/models/importers, even for previously unseen IDs.
        result = isolated('''
import importlib.abc, json, sys
class BlockLegacy(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        blocked = ('sqlalchemy', 'psycopg2', 'passlib', 'bcrypt', 'jose',
                   'app.db', 'app.models', 'app.deps', 'app.core.config',
                   'app.services.postgres', 'app.services.tmdb_service')
        if any(fullname == p or fullname.startswith(p + '.') for p in blocked):
            raise AssertionError('Catalogue tried to import ' + fullname)
sys.meta_path.insert(0, BlockLegacy())
from fastapi.testclient import TestClient
from app.application import create_app
from app.catalogue.client import TMDBClient, TMDBSettings
from app.catalogue.routes import get_tmdb_client
async def transport(url, headers, timeout):
    if '/search/' in url:
        data = {'results': [{'id': 999999, 'title': 'Unseen', 'poster_path': '/p.jpg',
                            'vote_average': 8, 'overview': ''}]}
    elif '/movie/' in url:
        data = {'id': 999999, 'title': 'Unseen'}
    else:
        data = {'id': 999999, 'name': 'Unseen'}
    return 200, json.dumps(data)
app = create_app(include_legacy_api=False)
app.dependency_overrides[get_tmdb_client] = lambda: TMDBClient(TMDBSettings(api_key='test'), transport)
with TestClient(app) as client:
    for path in ('search/movie?q=unseen', 'movie/999999', 'person/999999'):
        response = client.get('/api/tmdb/' + path)
        assert response.status_code == 200, response.text
assert not any(m.startswith(('app.db', 'app.models', 'app.services.postgres', 'sqlalchemy')) for m in sys.modules)
''')
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_actual_worker_entrypoint_with_mocked_tmdb(self):
        result = isolated('''
import json, runpy, sys
from pathlib import Path
from types import SimpleNamespace
sys.modules['workers'] = SimpleNamespace(asgi=SimpleNamespace(entrypoint=lambda app: app))
sys.path.insert(0, str(Path('app').resolve()))
worker = runpy.run_path('app/worker.py')
from fastapi.testclient import TestClient
from catalogue.client import TMDBClient, TMDBSettings
from catalogue.routes import get_tmdb_client
async def transport(url, headers, timeout):
    return 200, json.dumps({'id': 348, 'title': 'Alien'})
app = worker['app']
app.dependency_overrides[get_tmdb_client] = lambda: TMDBClient(TMDBSettings(api_key='test'), transport)
with TestClient(app) as client:
    assert client.get('/api/health').status_code == 200
    assert client.get('/api/tmdb/movie/348').json()['tmdb_id'] == 348
    assert client.get('/api/v1/users/me').status_code == 404
assert not any(m.startswith(('app.db', 'db.', 'app.models', 'models.', 'sqlalchemy',
                             'passlib', 'bcrypt', 'services.postgres')) for m in sys.modules)
''')
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
