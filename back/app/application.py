from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from importlib import import_module


def create_app(*, include_legacy_api: bool = True, include_social_api: bool = False,
               include_assets: bool = False, include_account_api: bool = False,
               include_follows_api: bool = False) -> FastAPI:
    if include_legacy_api and include_social_api:
        raise ValueError("Choose either the legacy API or the limited social API")
    if include_account_api and not include_social_api:
        raise ValueError("The account API requires the limited social API")
    if include_follows_api and not include_social_api:
        raise ValueError("The follows API requires the limited social API")
    app = FastAPI(title="MovieGraph")
    # Wrangler imports this factory as `application`; local API uses app.application.
    prefix = f"{__package__}." if __package__ else ""
    catalogue = import_module(f"{prefix}catalogue.routes")
    tmdb_error = import_module(f"{prefix}catalogue.client").TMDBError
    app.include_router(catalogue.router)

    @app.exception_handler(tmdb_error)
    async def tmdb_failure(request, exc):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.get("/api/health", tags=["Health"])
    async def health() -> dict[str, str]:
        # Liveness only: no credentials, database calls, or schema creation.
        return {"status": "ok"}

    if include_social_api:
        social = import_module(f"{prefix}social.routes")
        social.install_social_api(
            app,
            include_accounts=include_account_api,
            include_follows=include_follows_api,
        )

    if include_assets:
        @app.api_route("/{path:path}", methods=["GET", "HEAD"], include_in_schema=False)
        async def serve_frontend(path: str, request: Request):
            if path == "api" or path.startswith("api/"):
                raise HTTPException(404, "Not found")
            env = request.scope.get("env")
            assets = import_module(f"{prefix}db.runtime").binding_value(env, "ASSETS")
            if assets is None:
                raise HTTPException(404, "Frontend assets are not configured")
            asset_url = f"https://assets.local/{path}"
            if request.url.query:
                asset_url = f"{asset_url}?{request.url.query}"
            asset_response = await assets.fetch(asset_url)
            return Response(
                content=await asset_response.bytes(),
                status_code=asset_response.status,
                headers=dict(asset_response.headers),
            )

    if include_legacy_api:
        from app.core.config import CORS_ORIGINS
        from app.api.v1 import users, movies, follows, people, recommendations, comments, movie_likes

        if CORS_ORIGINS:
            app.add_middleware(
                CORSMiddleware,
                allow_origins=CORS_ORIGINS,
                allow_credentials=True,
                allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
                allow_headers=["Authorization", "Content-Type"],
            )
        for router in (users, follows, movies, people, recommendations, comments, movie_likes):
            app.include_router(router.router, prefix="/api/v1")

    return app
