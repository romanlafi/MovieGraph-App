"""Protect the complete ASGI lifecycle before its first suspension."""

import asyncio


def entrypoint(app):
    from workers import asgi

    class Default(asgi.entrypoint(app)):
        async def fetch(self, request):
            operation = asyncio.create_task(super().fetch(request))
            self.ctx.waitUntil(operation)
            return await asyncio.shield(operation)

    return Default
