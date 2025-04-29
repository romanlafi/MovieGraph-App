from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import users, movies, friends, people, recommendations, comments

app = FastAPI()

app.add_middleware(
    CORSMiddleware, #type: ignore
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api/v1")
app.include_router(friends.router, prefix="/api/v1")
app.include_router(movies.router, prefix="/api/v1")
app.include_router(people.router, prefix="/api/v1")
app.include_router(recommendations.router, prefix="/api/v1")
app.include_router(comments.router, prefix="/api/v1")
