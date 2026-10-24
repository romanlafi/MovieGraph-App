"""Cloudflare admission control before routing, parsing bodies or opening sockets."""

import hashlib
import logging
import os
import sys

from fastapi import HTTPException, Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.bindings import binding_value


logger = logging.getLogger(__name__)
MAX_BODY_BYTES = 16_384
MAX_QUERY_BYTES = 2_048
UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


async def check_limit(env, name: str, key: str) -> None:
    limiter = binding_value(env, name)
    if limiter is None:
        environment = binding_value(env, "APP_ENV", os.getenv("APP_ENV", "development"))
        if environment in {"production", "pre"}:
            raise HTTPException(503, "API protection is not configured", headers={"Retry-After": "60"})
        return
    try:
        options = {"key": key}
        if sys.platform == "emscripten":
            from js import Object
            from pyodide.ffi import to_js

            options = to_js(options, dict_converter=Object.fromEntries)
        result = await limiter.limit(options)
        allowed = result.success
    except Exception as error:
        # Never log keys, IPs, credentials or exception messages from bindings.
        logger.warning("API rate limiter %s failed (%s)", name, type(error).__name__)
        raise HTTPException(503, "API protection is unavailable", headers={"Retry-After": "60"}) from None
    if not allowed:
        raise HTTPException(429, "Too many requests. Try again shortly.", headers={"Retry-After": "60"})


async def admit_request(request: Request) -> None:
    env = request.scope.get("env")
    # Only Cloudflare's header is trusted. Forwarded headers and bearer strings
    # must not let a caller manufacture a fresh quota on every request.
    client_ip = request.headers.get("cf-connecting-ip") or "unknown"
    key = hashlib.sha256(client_ip.encode()).hexdigest()
    await check_limit(env, "API_IP_RATE_LIMITER", f"api:{key}")
    path = request.url.path
    if path == "/api/v1" or path.startswith("/api/v1/"):
        await check_limit(env, "SOCIAL_IP_RATE_LIMITER", f"social:{key}")
        if request.method in UNSAFE_METHODS:
            await check_limit(env, "WRITE_IP_RATE_LIMITER", f"write:{key}")
        if request.method == "POST" and path.rstrip("/") == "/api/v1/users":
            await check_limit(env, "REGISTER_IP_RATE_LIMITER", f"register:{key}")
        # Last check: IP-throttled requests do not consume the shared allowance.
        # A circuit breaker for rotating IPs; approximate per Cloudflare location.
        await check_limit(env, "SOCIAL_GLOBAL_RATE_LIMITER", "social:all")
    elif path == "/api/tmdb" or path.startswith("/api/tmdb/"):
        await check_limit(env, "CATALOGUE_IP_RATE_LIMITER", f"catalogue:{key}")


class APIProtectionMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        path = scope.get("path", "")
        protected = path == "/api" or path.startswith("/api/") or path in {
            "/docs", "/redoc", "/openapi.json",
        } or path.startswith("/docs/")
        if scope["type"] != "http" or not protected:
            await self.app(scope, receive, send)
            return
        try:
            request = Request(scope)
            await admit_request(request)
            if len(scope.get("query_string", b"")) > MAX_QUERY_BYTES:
                raise HTTPException(414, "Query string is too long")
            length = request.headers.get("content-length")
            if length is not None:
                try:
                    declared_size = int(length)
                except ValueError:
                    raise HTTPException(400, "Invalid Content-Length") from None
                if declared_size < 0:
                    raise HTTPException(400, "Invalid Content-Length")
                if declared_size > MAX_BODY_BYTES:
                    raise HTTPException(413, "Request body is too large")
            # Buffer at most 16 KiB, including chunked bodies, before dependencies
            # execute. Checking Content-Length alone is trivially bypassed.
            body = bytearray()
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                body.extend(message.get("body", b""))
                if len(body) > MAX_BODY_BYTES:
                    raise HTTPException(413, "Request body is too large")
                if not message.get("more_body", False):
                    break
        except HTTPException as error:
            response = JSONResponse({"detail": error.detail}, status_code=error.status_code,
                                    headers={**(error.headers or {}), "Cache-Control": "no-store"})
            await response(scope, receive, send)
            return

        delivered = False

        async def replay_body():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, replay_body, send)
