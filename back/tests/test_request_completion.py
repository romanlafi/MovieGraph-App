import asyncio
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from app.core.request_completion import entrypoint


class RequestCompletionTests(unittest.IsolatedAsyncioTestCase):
    def worker(self, handler, registered):
        class ASGIEntrypoint:
            async def fetch(self, request):
                return await handler(request)

        workers = SimpleNamespace(asgi=SimpleNamespace(entrypoint=lambda app: ASGIEntrypoint))
        with patch.dict("sys.modules", {"workers": workers}):
            worker = entrypoint(object())()
        worker.ctx = SimpleNamespace(waitUntil=registered.append)
        return worker

    async def test_disconnected_request_finishes_asgi_startup_and_cleanup(self):
        started = asyncio.Event()
        finish_startup = asyncio.Event()
        cleaned_up = asyncio.Event()
        registered = []

        async def asgi_fetch(request):
            try:
                started.set()
                await finish_startup.wait()
                return "response"
            finally:
                cleaned_up.set()

        worker = self.worker(asgi_fetch, registered)
        request = asyncio.create_task(worker.fetch(object()))
        await started.wait()
        request.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await request
        self.assertEqual(len(registered), 1)
        self.assertFalse(registered[0].done())
        self.assertFalse(cleaned_up.is_set())
        finish_startup.set()
        self.assertEqual(await registered[0], "response")
        self.assertTrue(cleaned_up.is_set())

    async def test_worker_application_errors_still_propagate(self):
        registered = []

        async def asgi_fetch(request):
            raise ValueError("request failed")

        worker = self.worker(asgi_fetch, registered)
        with self.assertRaisesRegex(ValueError, "request failed"):
            await worker.fetch(object())
        self.assertTrue(registered[0].done())

    async def test_response_waits_for_application_completion(self):
        registered = []

        async def asgi_fetch(request):
            return "response"

        worker = self.worker(asgi_fetch, registered)
        self.assertEqual(await worker.fetch(object()), "response")
        self.assertTrue(registered[0].done())
