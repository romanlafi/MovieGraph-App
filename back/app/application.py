from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from importlib import import_module


def create_app(*, include_legacy_api: bool = True, include_social_api: bool = False) -> FastAPI:
    if include_legacy_api and include_social_api:
        raise ValueError("Choose either the legacy API or the limited social API")
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
        social.install_social_api(app)

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
