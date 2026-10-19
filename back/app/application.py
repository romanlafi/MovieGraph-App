from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response

from app.catalogue.client import TMDBError
from app.catalogue.routes import router as catalogue_router


def _validate_api_options(include_social_api: bool, include_account_api: bool, include_follows_api: bool) -> None:
    if include_account_api and not include_social_api:
        raise ValueError("The account API requires the social API")
    if include_follows_api and not include_social_api:
        raise ValueError("The follows API requires the social API")


def create_app(
    *,
    include_social_api: bool = False,
    include_assets: bool = False,
    include_account_api: bool = False,
    include_follows_api: bool = False,
) -> FastAPI:
    _validate_api_options(include_social_api, include_account_api, include_follows_api)
    app = FastAPI(title="MovieGraph")
    app.include_router(catalogue_router)

    @app.exception_handler(TMDBError)
    async def tmdb_failure(request, exc):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.get("/api/health", tags=["Health"])
    async def health() -> dict[str, str]:
        # Liveness only: no credentials, database calls, or schema creation.
        return {"status": "ok"}

    if include_social_api:
        from app.social.routes import install_social_api

        install_social_api(
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
            from app.db.runtime import binding_value

            assets = binding_value(env, "ASSETS")
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

    return app
