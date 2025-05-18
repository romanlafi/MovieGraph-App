from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import users, movies, follows, people, recommendations, comments

app = FastAPI()

app.add_middleware(
    CORSMiddleware, #type: ignore
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

routers = [users, follows, movies, people, recommendations, comments]

for router in routers:
    app.include_router(router.router, prefix="/api/v1")
