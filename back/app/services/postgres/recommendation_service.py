from random import sample
from typing import List, Counter

from sqlalchemy import or_, and_, func, select
from sqlalchemy.orm import Session

from app.models.genre import Genre
from app.models.movie import Movie
from app.models.movie_person import MoviePerson
from app.models.user import User
from app.schemas.movie import MovieListResponse, movie_to_list_response
from app.schemas.person import PersonResponse


def get_hero_recommendations(db: Session, user_email: str) -> List[MovieListResponse]:
    user = db.query(User).filter(User.email == user_email).first()
    return get_related_movies_from_likes(db, user, limit=3)

def get_recommendations_by_likes(db: Session, user_email: str, limit: int = 10) -> List[MovieListResponse]:
    user = db.query(User).filter(User.email == user_email).first()
    return get_related_movies_from_likes(db, user, limit)

def get_recommendations_by_friends(db: Session, user_email: str) -> list[MovieListResponse]:
    user = db.query(User).filter(User.email == user_email).first()

    followed_ids = [f.id for f in user.following]
    liked_ids = {m.id for m in user.likes}

    if not followed_ids:
        return []

    subquery = (
        db.query(Movie.id)
        .join(Movie.liked_by)
        .filter(User.id.in_(followed_ids))
        .filter(~Movie.id.in_(liked_ids))
        .distinct()
        .subquery()
    )

    recommended_movies = (
        db.query(Movie)
        .filter(Movie.id.in_(select(subquery)))
        .order_by(func.random())
        .limit(20)
        .all()
    )

    return [movie_to_list_response(m) for m in recommended_movies]

def get_recommended_people(db: Session, user_email: str) -> List[PersonResponse]:
    user = db.query(User).filter(User.email == user_email).first()
    liked_movies = user.likes

    if not liked_movies:
        return []

    person_counter = Counter()

    for movie in liked_movies:
        for mp in movie.movie_persons:
            person_counter[mp.person] += 1

    most_common = person_counter.most_common(10)

    return [
        PersonResponse(
            id=person.id,
            tmdb_id=person.tmdb_id,
            name=person.name,
            photo_url=person.photo_url
        )
        for person, _ in most_common
    ]

def get_related_movies_from_likes(
    db: Session, user: User, limit: int
) -> list[MovieListResponse]:
    liked_movies = user.likes
    liked_ids = {m.id for m in liked_movies}

    if not liked_movies:
        return []

    person_ids = {mp.person_id for m in liked_movies for mp in m.movie_persons}
    genre_ids = {g.id for m in liked_movies for g in m.genres}
    collection_ids = {m.collection_id for m in liked_movies if m.collection_id}

    subquery = (
        db.query(Movie.id)
        .filter(
            Movie.id.notin_(liked_ids),
            or_(
                and_(
                    Movie.movie_persons.any(MoviePerson.person_id.in_(person_ids)),
                    Movie.genres.any(Genre.id.in_(genre_ids))
                ),
                Movie.collection_id.in_(collection_ids)
            )
        )
        .distinct()
        .subquery()
    )

    related_movies = (
        db.query(Movie)
        .filter(Movie.id.in_(select(subquery.c.id)))
        .order_by(func.random())
        .limit(limit)
        .all()
    )

    return [movie_to_list_response(m) for m in related_movies]