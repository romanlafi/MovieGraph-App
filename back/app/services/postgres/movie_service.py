from typing import List

from sqlalchemy.orm import Session

from app.exceptions import MovieNotFoundError
from app.models.genre import Genre
from app.models.movie import Movie
from app.models.movie_person import MoviePerson
from app.models.person import Person
from app.schemas.movie import MovieListResponse, movie_to_list_response, MovieResponse, movie_to_response
from app.services.tmdb_service import fetch_movie_data_by_tmdb, search_movies_tmdb


def search_movies(query: str, db: Session, limit: int = 10, page: int = 1) -> list[MovieListResponse]:
    results = []
    seen_titles = set()

    # Buscar en base de datos
    local = db.query(Movie).filter(Movie.title.ilike(f"%{query}%")).limit(limit).all()
    for m in local:
        results.append(movie_to_list_response(m))
        seen_titles.add(m.title.lower())

    # Si no hay suficientes resultados, buscar en TMDB
    if len(results) >= limit:
        return results

    tmdb_page = 1
    while len(results) < limit:
        tmdb_results = search_movies_tmdb(query, page=tmdb_page)
        if not tmdb_results:
            break

        for r in tmdb_results:
            if r["title"].lower() in seen_titles:
                continue

            existing = db.query(Movie).filter_by(tmdb_id=r["id"]).first()
            if existing:
                results.append(movie_to_list_response(existing))
                seen_titles.add(existing.title.lower())
                continue

            # Buscar detalles y registrar
            full_data = fetch_movie_data_by_tmdb(r["id"])
            if not full_data or not full_data.get("title"):
                continue

            movie = register_movie_from_data(full_data, db)
            if movie:
                results.append(movie_to_list_response(movie))
                seen_titles.add(movie.title.lower())

            if len(results) >= limit:
                break
        tmdb_page += 1

    return results

def register_movie_from_data(data: dict, db: Session) -> Movie:
    # Verificar si ya existe por tmdb_id
    existing = db.query(Movie).filter_by(tmdb_id=data["tmdb_id"]).first()
    if existing:
        return existing

    # Crear objeto Movie
    movie = Movie(
        tmdb_id=data["tmdb_id"],
        title=data["title"],
        year=data.get("year"),
        poster_url=data.get("poster_url"),
        rated=data.get("rated"),
        released=data.get("released"),
        runtime=data.get("runtime"),
        box_office=data.get("box_office"),
        production=data.get("production"),
        website=data.get("website"),
        type=data.get("type"),
        plot=data.get("plot"),
        rating=data.get("rating"),
        trailer_url=data.get("trailer_url"),
    )
    db.add(movie)
    db.flush()

    # Añadir géneros
    for genre_name in data.get("genres", []):
        genre = db.query(Genre).filter_by(name=genre_name).first()
        if not genre:
            genre = Genre(name=genre_name)
            db.add(genre)
            db.flush()
        movie.genres.append(genre)

    # Añadir director
    director = data.get("director")
    if director:
        person = _get_or_create_person(db, director)
        movie_person = MoviePerson(
            person_id=person.id,
            movie_id=movie.id,
            role="DIRECTOR"
        )
        db.add(movie_person)


    for actor in data.get("actors", []):
        person = _get_or_create_person(db, actor)
        movie_person = MoviePerson(
            person_id=person.id,
            movie_id=movie.id,
            role="ACTOR",
            character=actor["character"]
        )
        db.add(movie_person)

    db.commit()
    db.refresh(movie)
    return movie

def _get_or_create_person(db: Session, person_data: dict) -> Person:
    person = db.query(Person).filter_by(tmdb_id=person_data["tmdb_id"]).first()
    if person:
        return person

    person = Person(
        tmdb_id=person_data["tmdb_id"],
        name=person_data.get("name"),
        photo_url=person_data.get("profile_path"),
    )
    db.add(person)
    db.flush()
    return person

def search_movies_by_genre(genre_id: int, db: Session, page: int, limit: int) -> list[MovieListResponse]:
    offset = (page - 1) * limit
    movies = (
        db.query(Movie)
        .join(Movie.genres)
        .filter(Genre.id == genre_id)
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [movie_to_list_response(m) for m in movies]

def get_movie_by_id(movie_id: int, db: Session) -> MovieResponse:
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        return None

    return movie_to_response(movie)

def get_related_movies_by_people_and_genres(movie_id: int, db: Session) -> List[Movie]:
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        return []

    people_ids = [mp.person_id for mp in movie.movie_persons]

    related_by_people = db.query(Movie).join(Movie.movie_persons).filter(
        MoviePerson.person_id.in_(people_ids),
        Movie.id != movie.id
    ).distinct().all()

    genre_ids = [genre.id for genre in movie.genres]

    related_by_genres = db.query(Movie).join(Movie.genres).filter(
        Genre.id.in_(genre_ids),
        Movie.id != movie.id
    ).distinct().all()

    all_related = {m.id: m for m in related_by_people + related_by_genres}.values()

    return list(all_related)[:20]

def get_or_fetch_movie_by_tmdb_id(tmdb_id: int, db: Session) -> MovieResponse:
    movie = db.query(Movie).filter_by(tmdb_id=tmdb_id).first()
    if movie:
        return movie_to_response(movie)

    data = fetch_movie_data_by_tmdb(tmdb_id)
    if not data:
        raise MovieNotFoundError()

    movie = register_movie_from_data(data, db)
    return movie_to_response(movie)