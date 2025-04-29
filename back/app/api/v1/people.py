from typing import List

from fastapi import APIRouter, Query, HTTPException

from app.schemas.movie import MovieListResponse
from app.schemas.person import PersonResponse, PersonWithRoleResponse
from app.services.person_service import (
    search_people,
    get_person_detail,
    get_person_filmography,
    get_filmography_as_actor,
    get_filmography_as_director,
    list_people_by_movie
)

router = APIRouter(prefix="/people", tags=["People"])

@router.get("/", response_model=list[PersonResponse])
def search(query: str = Query(..., min_length=2)):
    return search_people(query)

@router.get("/detail", response_model=PersonResponse)
def get_person(person_id: str = Query(...)):
    return get_person_detail(person_id)

@router.get("/filmography", response_model=list[MovieListResponse])
def get_filmography(person_id: str = Query(...)):
    return get_person_filmography(person_id)

@router.get("/acted", response_model=list[MovieListResponse])
def acted_movies(person_id: str = Query(...)):
    return get_filmography_as_actor(person_id)

@router.get("/directed", response_model=list[MovieListResponse])
def directed_movies(person_id: str = Query(...)):
    return get_filmography_as_director(person_id)

@router.get("/movie", response_model=List[PersonWithRoleResponse])
def get_people_for_movie(tmdb_id: int = Query(..., description="TMDb ID of the movie")):
    people = list_people_by_movie(tmdb_id)
    if not people:
        raise HTTPException(status_code=404, detail="No people found for this movie")
    return people