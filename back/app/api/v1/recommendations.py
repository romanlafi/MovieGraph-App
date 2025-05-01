from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.deps.auth import get_current_user
from app.schemas.movie import MovieListResponse
from app.services.postgres.recommendation_service import get_friend_recommendations

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.get("/", response_model=list[MovieListResponse])
def get_recommendations(
        current_user = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    return get_friend_recommendations(db, current_user.email)
