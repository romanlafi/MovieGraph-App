from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.deps.auth import get_current_user
from app.exceptions import MovieNotFoundError
from app.models.collection import Collection
from app.models.genre import Genre
from app.models.movie import Movie
from app.models.user import User
from app.schemas.genre import GenreResponse
from app.schemas.movie import (
    MovieListResponse,
    MovieResponse,
    CollectionResponse,
    movie_to_list_response
)
from app.services.postgres.movie_service import (
    search_movies,
    search_movies_by_genre,
    get_movie_by_id,
    get_related_movies_by_people_and_genres,
    get_or_fetch_movie_by_tmdb_id,
    get_random_movies, get_top_rated_movies, get_latest_movies, get_random_collection_with_movies
)
from app.services.tmdb_service import search_tmdb_only

router = APIRouter(prefix="/movies", tags=["Movies"])

@router.get("/search", response_model=List[MovieListResponse])
def search_movies_endpoint(
    query: str = Query(..., min_length=2),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    return search_movies(query=query, db=db, page=page, limit=limit)

@router.get("/by_genre", response_model=List[MovieListResponse])
def get_movies_by_genre(
    genre_name: str = Query(..., description="Name of the genre"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db),
):
    genre = db.query(Genre).filter(Genre.name.ilike(genre_name)).first()
    if not genre:
        raise MovieNotFoundError()
    return search_movies_by_genre(genre.id, db, page, limit)

@router.get("/", response_model=MovieResponse)
def get_movie(movie_id: int = Query(...), db: Session = Depends(get_db)):
    movie = get_movie_by_id(movie_id, db)
    if not movie:
        raise MovieNotFoundError()
    return movie

@router.post("/like")
def like_movie(
        movie_id: int = Query(...),
        db: Session = Depends(get_db),
        current_user=Depends(get_current_user)
):
    user = db.query(User).filter(User.email == current_user.email).first()
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if movie not in user.likes:
        user.likes.append(movie)
        db.commit()
    return {"detail": "Movie liked"}

@router.delete("/like")
def unlike_movie(
        movie_id: int = Query(...),
        db: Session = Depends(get_db),
        current_user=Depends(get_current_user)
):
    user = db.query(User).filter(User.email == current_user.email).first()
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if movie in user.likes:
        user.likes.remove(movie)
        db.commit()
    return {"detail": "Movie unliked"}

@router.get("/likes", response_model=List[MovieListResponse])
def get_user_likes(
        db: Session = Depends(get_db),
        current_user=Depends(get_current_user)
):
    user = db.query(User).filter(User.email == current_user.email).first()
    return [movie_to_list_response(m) for m in user.likes]

@router.get("/genres", response_model=List[GenreResponse])
def get_genres(db: Session = Depends(get_db)):
    return db.query(Genre).order_by(Genre.name).all()

@router.get("/related", response_model=List[MovieListResponse])
def related_movies(
        movie_id: int = Query(...),
        db: Session = Depends(get_db)
):
    movies = get_related_movies_by_people_and_genres(movie_id, db)
    return [movie_to_list_response(m) for m in movies]

@router.get("/tmdb_search")
def search_tmdb_movies(query: str = Query(..., min_length=2)):
    return search_tmdb_only(query)

@router.get("/detail", response_model=MovieResponse)
def get_movie_by_tmdb_id(
    tmdb_id: int = Query(...),
    db: Session = Depends(get_db)
):
    return get_or_fetch_movie_by_tmdb_id(tmdb_id, db)

@router.get("/random", response_model=List[MovieListResponse])
def get_random_movies_endpoint(
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db)
):
    return get_random_movies(db, limit)

@router.get("/random_collection", response_model=CollectionResponse)
def get_random_collection(
    db: Session = Depends(get_db)
):
    return get_random_collection_with_movies(db)

@router.get("/collections", response_model=List[CollectionResponse])
def get_collections(db: Session = Depends(get_db)):
    return (
        db.query(Collection)
        .join(Collection.movies)
        .group_by(Collection.id)
        .having(func.count(Movie.id) >= 2)
        .order_by(Collection.name)
        .all()
    )

@router.get("/by_collection", response_model=List[MovieListResponse])
def get_movies_by_collection(
    collection_id: int = Query(..., description="ID of the collection"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    offset = (page - 1) * limit
    movies = (
        db.query(Movie)
        .filter(Movie.collection_id == collection_id)
        .order_by(Movie.year)
        .offset(offset)
        .limit(limit)
        .all()
    )
    if not movies:
        raise MovieNotFoundError()
    return [movie_to_list_response(m) for m in movies]

@router.get("/top_rated", response_model=List[MovieListResponse])
def get_top_rated(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    return get_top_rated_movies(db=db, page=page, limit=limit)

@router.get("/latest", response_model=List[MovieListResponse])
def get_latest(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    return get_latest_movies(db=db, page=page, limit=limit)