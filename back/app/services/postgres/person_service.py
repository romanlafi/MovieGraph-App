from random import sample
from typing import List

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.exceptions import PersonNotFoundError
from app.models.movie import Movie
from app.models.movie_person import MoviePerson
from app.models.person import Person
from app.schemas.movie import MovieListResponse, movie_to_list_response
from app.schemas.person import PersonWithRoleResponse, PersonResponse
from app.services.tmdb_service import fetch_person_data_by_tmdb


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

def get_or_fetch_person_by_tmdb_id(tmdb_id: int, db: Session) -> PersonResponse:
    person = db.query(Person).filter_by(tmdb_id=tmdb_id).first()

    if person and person.photo_url and person.biography and person.birthday:
        return PersonResponse(
            id=person.id,
            tmdb_id=person.tmdb_id,
            name=person.name,
            photo_url=person.photo_url if person.photo_url else None,
            biography=person.biography,
            birthday=person.birthday,
            place_of_birth=person.place_of_birth
        )

    data = fetch_person_data_by_tmdb(tmdb_id)
    if not data:
        raise ValueError("TMDB fetch failed")

    if not person:
        person = Person(**data)
        db.add(person)
    else:
        for key, value in data.items():
            setattr(person, key, value)

    db.commit()
    db.refresh(person)

    return PersonResponse(
        id=person.id,
        tmdb_id=person.tmdb_id,
        name=person.name,
        photo_url=person.photo_url if person.photo_url else None,
        biography=person.biography,
        birthday=person.birthday,
        place_of_birth=person.place_of_birth
    )

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
        person = mp.person
        if not person:
            continue

        pid = mp.person.id
        if pid not in people_dict:
            people_dict[pid] = {
                "id": pid,
                "tmdb_id": mp.person.tmdb_id,
                "name": mp.person.name,
                "photo_url": mp.person.photo_url if mp.person.photo_url else None,
                "roles": set(),
                "character": None
            }
        people_dict[pid]["roles"].add(mp.role)

        if mp.role == "ACTOR" and mp.character:
            people_dict[pid]["character"] = mp.character

    return [
        PersonWithRoleResponse(
            id=p["id"],
            tmdb_id=p["tmdb_id"],
            name=p["name"],
            photo_url=p["photo_url"],
            role=", ".join(sorted(p["roles"])),
            character=p["character"] if p["character"] else None
        )
        for p in people_dict.values()
    ]

def get_related_people_by_person_id(person_id: int, db: Session) -> List[PersonResponse]:
    movie_ids = db.query(MoviePerson.movie_id).filter(
        MoviePerson.person_id == person_id
    ).subquery()

    people = db.query(Person).join(MoviePerson).filter(
        MoviePerson.movie_id.in_(select(movie_ids)),
        MoviePerson.person_id != person_id
    ).distinct().all()

    selected = sample(people, min(len(people), 15))

    return [
        PersonResponse(
            id=p.id,
            tmdb_id=p.tmdb_id,
            name=p.name,
            photo_url=p.photo_url
        )
        for p in selected
    ]

def get_random_people_list(db: Session, limit: int = 15) -> List[PersonResponse]:
    people = (
        db.query(Person)
        .filter(Person.photo_url.isnot(None), Person.photo_url != "")
        .order_by(func.random())
        .limit(limit)
        .all()
    )

    return [
        PersonResponse(
            id=p.id,
            tmdb_id=p.tmdb_id,
            name=p.name,
            photo_url=p.photo_url
        )
        for p in people
    ]
