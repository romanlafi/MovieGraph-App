from typing import List

from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.exceptions import PeopleNotFoundError
from app.schemas.movie import MovieListResponse
from app.schemas.person import PersonResponse, PersonWithRoleResponse

from app.services.postgres.person_service import (
    list_people_by_movie_id,
    search_people,
    get_person_detail,
    get_person_filmography,
    get_filmography_as_actor,
    get_filmography_as_director,
    get_or_fetch_person_by_tmdb_id,
    get_related_people_by_person_id, get_random_people_list
)

router = APIRouter(prefix="/people", tags=["People"])

@router.get("/", response_model=list[PersonResponse])
def search(
        query: str = Query(..., min_length=2),
        db: Session = Depends(get_db)
):
    return search_people(query, db)

@router.get("/detail", response_model=PersonResponse)
def get_person(person_id: int = Query(...), db: Session = Depends(get_db)):
    return get_person_detail(person_id, db)

@router.get("/filmography", response_model=list[MovieListResponse])
def get_filmography(person_id: int = Query(...), db: Session = Depends(get_db)):
    return get_person_filmography(person_id, db)

@router.get("/acted", response_model=list[MovieListResponse])
def acted_movies(person_id: int = Query(...), db: Session = Depends(get_db)):
    return get_filmography_as_actor(person_id, db)

@router.get("/directed", response_model=list[MovieListResponse])
def directed_movies(person_id: int = Query(...), db: Session = Depends(get_db)):
    return get_filmography_as_director(person_id, db)

@router.get("/movie", response_model=List[PersonWithRoleResponse])
def get_people_for_movie(
        movie_id: int = Query(...),
        db: Session = Depends(get_db)
):
    return list_people_by_movie_id(movie_id, db)

@router.get("/by_tmdb", response_model=PersonResponse)
def get_person_by_tmdb_id(
    tmdb_id: int = Query(...),
    db: Session = Depends(get_db)
):
    return get_or_fetch_person_by_tmdb_id(tmdb_id, db)

@router.get("/related", response_model=List[PersonResponse])
def related_people(
    person_id: int = Query(...),
    db: Session = Depends(get_db)
):
    return get_related_people_by_person_id(person_id, db)

@router.get("/random", response_model=List[PersonResponse])
def get_random_people(
    db: Session = Depends(get_db)
):
    return get_random_people_list(db)