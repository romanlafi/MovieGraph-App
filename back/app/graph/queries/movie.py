from typing import Optional, List

from neo4j.graph import Node

from app.graph.driver import get_driver

def create_movie_node(
    tmdb_id: int,
    title: str,
    year: int = None,
    genres: list[str] = None,
    poster_url: str = None,
    rated: str = None,
    released: str = None,
    runtime: str = None,
    director: str = None,
    box_office: str = None,
    production: str = None,
    website: str = None,
    type: str = None,
    plot: str = None,
    rating: float = None,
    trailer_url: str = None
):
    query = """
    MERGE (m:Movie {tmdb_id: $tmdb_id})
    SET m.title = $title,
        m.year = $year,
        m.genres = $genres,
        m.poster_url = $poster_url,
        m.rated = $rated,
        m.released = $released,
        m.runtime = $runtime,
        m.director = $director,
        m.box_office = $box_office,
        m.production = $production,
        m.website = $website,
        m.type = $type,
        m.plot = $plot,
        m.rating = $rating,
        m.trailer_url = $trailer_url
    RETURN m
    """
    with get_driver().session() as session:
        result = session.run(query, {
            "tmdb_id": tmdb_id,
            "title": title,
            "year": year,
            "genres": genres or [],
            "poster_url": poster_url,
            "rated": rated,
            "released": released,
            "runtime": runtime,
            "director": director,
            "box_office": box_office,
            "production": production,
            "website": website,
            "type": type,
            "plot": plot,
            "rating": rating,
            "trailer_url": trailer_url
        })
        record = result.single()
        return record["m"] if record else None

def search_movies_in_neo4j(
        query: str,
        skip: int,
        limit: int
) -> List[Node]:
    query_cypher = """
    MATCH (m:Movie)
    WHERE toLower(m.title) CONTAINS toLower($query)
    RETURN m
    SKIP $skip
    LIMIT $limit
    """
    driver = get_driver()
    with driver.session() as session:
        result = session.run(query_cypher, {"query": query, "skip": skip, "limit": limit})
        return [record["m"] for record in result]

def search_movies_by_genre(
        genre: str,
        skip: int = 0,
        limit: int = 10
) -> List[Node]:
    query = """
    MATCH (m:Movie)
    WHERE $genre IN m.genres
    RETURN m
    ORDER BY m.year DESC
    SKIP $skip
    LIMIT $limit
    """
    with get_driver().session() as session:
        result = session.run(query, {"genre": genre, "skip": skip, "limit": limit})
        return [record["m"] for record in result]

def get_movie_by_tmdb_id(tmdb_id: str) -> Optional[Node]:
    query = """
    MATCH (m:Movie {tmdb_id: $tmdb_id})
    RETURN m
    """
    driver = get_driver()
    with driver.session() as session:
        result = session.run(query, {"tmdb_id": int(tmdb_id)})
        record = result.single()
        return record["m"] if record else None

def get_movie_by_title(title: str) -> Optional[Node]:
    query = "MATCH (m:Movie {title: $title}) RETURN m LIMIT 1"
    driver = get_driver()
    with driver.session() as session:
        result = session.run(query, {"title": title})
        record = result.single()
        return record["m"] if record else None

def like_movie_by_imdb_id(user_email: str, imdb_id: str) -> None:
    query = '''
        MATCH (u:User {email: $email}), (m:Movie {imdb_id: $imdb_id})
        MERGE (u)-[:LIKES]->(m)
        '''
    driver = get_driver()
    with driver.session() as session:
        session.run(query, {"email": user_email, "imdb_id": imdb_id})

def unlike_movie_by_imdb_id(user_email: str, imdb_id: str) -> None:
    query = '''
        MATCH (u:User {email: $email})-[l:LIKES]->(m:Movie {imdb_id: $imdb_id})
        DELETE l
        '''
    driver = get_driver()
    with driver.session() as session:
        session.run(query, {"email": user_email, "imdb_id": imdb_id})

def get_liked_movies(user_email: str) -> List[Node]:
    query = '''
    MATCH (u:User {email: $email})-[:LIKES]->(m:Movie)
    RETURN m
    '''
    driver = get_driver()
    with driver.session() as session:
        result = session.run(query, {"email": user_email})
        return [record["m"] for record in result]

def get_all_genres() -> List[str]:
    query = '''
        MATCH (m:Movie)
        UNWIND m.genres AS genre
        RETURN DISTINCT genre
        ORDER BY genre
        '''
    driver = get_driver()
    with driver.session() as session:
        result = session.run(query)
        return [record["genre"] for record in result]

def get_related_movies_by_people_and_genres(tmdb_id: str) -> List[Node]:
    query = """
        MATCH (m:Movie {tmdb_id: $tmdb_id})

        OPTIONAL MATCH (p:Person)-[:ACTED_IN|DIRECTED|WROTE]->(m)
        WITH m, COLLECT(p) AS people

        UNWIND people AS person
        MATCH (person)-[:ACTED_IN|DIRECTED|WROTE]->(related_by_people:Movie)
        WHERE related_by_people.tmdb_id <> $tmdb_id

        WITH m, COLLECT(DISTINCT related_by_people) AS people_movies

        UNWIND m.genres AS genre
        MATCH (related_by_genre:Movie)
        WHERE genre IN related_by_genre.genres AND related_by_genre.tmdb_id <> $tmdb_id

        WITH people_movies, COLLECT(DISTINCT related_by_genre) AS genre_movies

        WITH people_movies + genre_movies AS all_movies
        UNWIND all_movies AS movie
        RETURN DISTINCT movie
        LIMIT 20
        """
    driver = get_driver()
    with driver.session() as session:
        result = session.run(query, {"tmdb_id": int(tmdb_id)})
        return [record["movie"] for record in result]
