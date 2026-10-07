import asyncio
from types import SimpleNamespace
import unittest

from fastapi import HTTPException
from starlette.requests import Request

from app.application import create_app


class AssetResponse:
    status = 200
    headers = {"content-type": "text/html"}

    async def bytes(self):
        return b"<html>MovieGraph</html>"


class AssetsBinding:
    def __init__(self):
        self.urls = []

    async def fetch(self, url):
        self.urls.append(url)
        return AssetResponse()


class PreviewWorkerTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(include_legacy_api=False, include_social_api=True, include_assets=True)
        self.handler = next(route.endpoint for route in self.app.routes if getattr(route, "path", None) == "/{path:path}")

    def request(self, path: str, env=None, query_string=b""):
        scope = {
            "type": "http", "method": "GET", "scheme": "https", "server": ("preview.test", 443),
            "client": ("127.0.0.1", 1234), "root_path": "", "path": f"/{path}",
            "raw_path": f"/{path}".encode(), "query_string": query_string, "headers": [],
        }
        if env is not None:
            scope["env"] = env
        return Request(scope)

    def test_single_page_routes_are_served_from_assets_binding(self):
        assets = AssetsBinding()
        response = asyncio.run(self.handler("movie/550", self.request("movie/550", {"ASSETS": assets})))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.body, b"<html>MovieGraph</html>")
        self.assertEqual(assets.urls, ["https://assets.local/movie/550"])

    def test_frontend_query_string_is_preserved(self):
        assets = AssetsBinding()
        request = self.request("search", {"ASSETS": assets}, b"q=alien")
        asyncio.run(self.handler("search", request))
        self.assertEqual(assets.urls, ["https://assets.local/search?q=alien"])

    def test_unknown_api_paths_are_not_rewritten_to_the_spa(self):
        assets = AssetsBinding()
        with self.assertRaises(HTTPException) as caught:
            asyncio.run(self.handler("api/unknown", self.request("api/unknown", {"ASSETS": assets})))
        self.assertEqual(caught.exception.status_code, 404)
        self.assertEqual(assets.urls, [])

    def test_missing_assets_binding_fails_closed(self):
        with self.assertRaises(HTTPException) as caught:
            asyncio.run(self.handler("movie/550", self.request("movie/550")))
        self.assertEqual(caught.exception.status_code, 404)
