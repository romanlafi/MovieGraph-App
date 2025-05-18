from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.deps.auth import get_current_user
from app.schemas.movie import MovieListResponse
from app.schemas.person import PersonResponse
from app.services.postgres.recommendation_service import (
    get_hero_recommendations,
    get_recommendations_by_friends,
    get_recommended_people,
    get_recommendations_by_likes
)

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.get("/hero", response_model=List[MovieListResponse])
def get_hero(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_hero_recommendations(db, current_user.email)

@router.get("/by_likes", response_model=List[MovieListResponse])
def get_recommendations_from_likes(
    limit: int = Query(10, le=50),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_recommendations_by_likes(db, current_user.email, limit)

@router.get("/friends", response_model=List[MovieListResponse])
def get_friend_based_recommendations(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_recommendations_by_friends(db, current_user.email)

@router.get("/people", response_model=List[PersonResponse])
def get_recommended_people_route(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_recommended_people(db, current_user.email)