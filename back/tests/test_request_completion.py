import asyncio
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from app.core.request_completion import RequestCompletionMiddleware


class RequestCompletionTests(unittest.IsolatedAsyncioTestCase):
    async def test_disconnected_request_finishes_cleanup_before_next_request(self):
        started = asyncio.Event()
        finish = asyncio.Event()
        cleaned_up = asyncio.Event()
        registered = []

        async def application(scope, receive, send):
            try:
                started.set()
                await finish.wait()
            finally:
                cleaned_up.set()

        middleware = RequestCompletionMiddleware(application)
        with patch("app.core.request_completion.sys.platform", "emscripten"), patch.dict(
            "sys.modules", {"workers": SimpleNamespace(wait_until=registered.append)},
        ):
            request = asyncio.create_task(middleware({"type": "http"}, None, None))
            await started.wait()
            request.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await request
            self.assertEqual(len(registered), 1)
            self.assertFalse(registered[0].done())
            self.assertFalse(cleaned_up.is_set())
            finish.set()
            await registered[0]
            self.assertTrue(cleaned_up.is_set())

    async def test_worker_application_errors_still_propagate(self):
        registered = []

        async def application(scope, receive, send):
            raise ValueError("request failed")

        middleware = RequestCompletionMiddleware(application)
        with patch("app.core.request_completion.sys.platform", "emscripten"), patch.dict(
            "sys.modules", {"workers": SimpleNamespace(wait_until=registered.append)},
        ):
            with self.assertRaisesRegex(ValueError, "request failed"):
                await middleware({"type": "http"}, None, None)
        self.assertTrue(registered[0].done())

    async def test_local_requests_run_without_workers_runtime(self):
        received = []

        async def application(scope, receive, send):
            received.append(scope["type"])

        middleware = RequestCompletionMiddleware(application)
        await middleware({"type": "http"}, None, None)
        self.assertEqual(received, ["http"])
