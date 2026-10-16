"""Keep Worker request cleanup alive when the browser disconnects."""

import asyncio
import sys


class RequestCompletionMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or sys.platform != "emscripten":
            await self.app(scope, receive, send)
            return

        from workers import wait_until

        operation = asyncio.create_task(self.app(scope, receive, send))
        wait_until(operation)
        await asyncio.shield(operation)
