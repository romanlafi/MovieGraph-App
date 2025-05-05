from typing import List

from sqlalchemy.orm import Session

from app.exceptions import PersonNotFoundError
from app.models.movie import Movie
from app.models.movie_person import MoviePerson
from app.models.person import Person
from app.schemas.movie import MovieListResponse, movie_to_list_response
from app.schemas.person import PersonWithRoleResponse, PersonResponse


def search_people(query: str, db: Session) -> List[PersonResponse]:
    people = db.query(Person).filter(Person.name.ilike(f"%{query}%")).limit(30).all()
    return [
        PersonResponse(
            id=p.id,
            tmdb_id=p.tmdb_id,
            name=p.name,
            photo_url=f"https://image.tmdb.org/t/p/w500{p.photo_url}" if p.photo_url else None
        ) for p in people
    ]

def get_person_detail(person_id: int, db: Session) -> PersonResponse:
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise PersonNotFoundError()
    return PersonResponse(
        id=person.id,
        tmdb_id=person.tmdb_id,
        name=person.name,
        photo_url=f"https://image.tmdb.org/t/p/w500{person.photo_url}" if person.photo_url else None
    )

def get_person_filmography(person_id: int, db: Session) -> List[MovieListResponse]:
    roles = db.query(Movie).join(MoviePerson).filter(MoviePerson.person_id == person_id).all()
    return [movie_to_list_response(m) for m in roles]

def get_filmography_as_actor(person_id: int, db: Session) -> List[MovieListResponse]:
    roles = db.query(Movie).join(MoviePerson).filter(
        MoviePerson.person_id == person_id,
        MoviePerson.role == "ACTOR"
    ).all()
    return [movie_to_list_response(m) for m in roles]

def get_filmography_as_director(person_id: int, db: Session) -> List[MovieListResponse]:
    roles = db.query(Movie).join(MoviePerson).filter(
        MoviePerson.person_id == person_id,
        MoviePerson.role == "DIRECTOR"
    ).all()
    return [movie_to_list_response(m) for m in roles]

def list_people_by_movie_id(movie_id: int, db: Session) -> List[PersonWithRoleResponse]:
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        return []

    people_dict = {}

    for mp in movie.movie_persons:
        pid = mp.person.id
        if pid not in people_dict:
            people_dict[pid] = {
                "id": pid,
                "tmdb_id": mp.person.tmdb_id,
                "name": mp.person.name,
                "photo_url": f"https://image.tmdb.org/t/p/w500{mp.person.photo_url}" if mp.person.photo_url else None,
                "roles": set()
            }
        people_dict[pid]["roles"].add(mp.role)

    return [
        PersonWithRoleResponse(
            id=p["id"],
            tmdb_id=p["tmdb_id"],
            name=p["name"],
            photo_url=p["photo_url"],
            role=", ".join(sorted(p["roles"]))
        )
        for p in people_dict.values()
    ]
