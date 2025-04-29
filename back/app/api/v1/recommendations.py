from fastapi import APIRouter, Depends

from app.deps.auth import get_current_user
from app.schemas.movie import MovieListResponse
from app.services.recommendation_service import recommend_from_friends

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.get("/", response_model=list[MovieListResponse])
def get_recommendations(current_user = Depends(get_current_user)):
    return recommend_from_friends(current_user["email"])
