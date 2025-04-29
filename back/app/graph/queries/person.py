import uuid
from typing import Optional, List

from neo4j.graph import Node

from app.graph.driver import get_driver


def create_person(name: str) -> Optional[Node]:
    existing = get_person_by_name(name)
    if existing:
        return existing

    query = """
    CREATE (p:Person {
        person_id: $person_id,
        name: $name
    })
    RETURN p
    """
    driver = get_driver()
    person_id = str(uuid.uuid4())
    with driver.session() as session:
        result = session.run(query, {"person_id": person_id, "name": name})
        record = result.single()
        return record["p"] if record else None

def create_person_with_tmdb(tmdb_id: int, name: str, profile_path: Optional[str]) -> Optional[Node]:
    query = """
    MERGE (p:Person {tmdb_id: $tmdb_id})
    SET p.name = $name,
        p.profile_path = $profile_path
    RETURN p
    """
    with get_driver().session() as session:
        result = session.run(query, {
            "tmdb_id": tmdb_id,
            "name": name,
            "profile_path": profile_path
        })
        return result.single()["p"] if result.peek() else None

def get_person_by_id(person_id: str) -> Optional[Node]:
    query = """
        MATCH (p:Person {tmdb_id: $tmdb_id})
        RETURN p
        """
    driver = get_driver()
    with driver.session() as session:
        result = session.run(query, {"tmdb_id": person_id})
        record = result.single()
        return record["p"] if record else None

def get_person_by_name(name: str) -> Optional[Node]:
    query = "MATCH (p:Person {name: $name}) RETURN p LIMIT 1"
    driver = get_driver()
    with driver.session() as session:
        result = session.run(query, {"name": name})
        record = result.single()
        return record["p"] if record else None

def create_relationship(person_tmdb_id: int, movie_tmdb_id: int, rel_type: str):
    query = f"""
    MATCH (p:Person {{tmdb_id: $person_tmdb_id}})
    MATCH (m:Movie {{tmdb_id: $movie_tmdb_id}})
    MERGE (p)-[r:{rel_type}]->(m)
    RETURN r
    """
    with get_driver().session() as session:
        session.run(query, {
            "person_tmdb_id": person_tmdb_id,
            "movie_tmdb_id": movie_tmdb_id
        })

def search_people_by_name(name: str) -> List[Node]:
    query = '''
    MATCH (p:Person)
    WHERE toLower(p.name) CONTAINS toLower($query)
    RETURN p
    LIMIT 30
    '''
    driver = get_driver()
    with driver.session() as session:
        result = session.run(query, {"query": name})
        return [record["p"] for record in result]

def get_filmography_by_person_id(person_id: str) -> List[Node]:
    query = '''
    MATCH (p:Person {person_id: $person_id})-[:ACTED_IN|DIRECTED]->(m:Movie)
    RETURN DISTINCT m
    ORDER BY m.year DESC
    '''
    driver = get_driver()
    with driver.session() as session:
        result = session.run(query, {"person_id": person_id})
        return [record["m"] for record in result]

def get_movies_acted_by(person_id: str) -> List[Node]:
    query = """
    MATCH (p:Person {person_id: $person_id})-[:ACTED_IN]->(m:Movie)
    RETURN m
    ORDER BY m.year DESC
    """
    with get_driver().session() as session:
        result = session.run(query, {"person_id": person_id})
        return [record["m"] for record in result]

def get_movies_directed_by(person_id: str) -> List[Node]:
    query = """
    MATCH (p:Person {person_id: $person_id})-[:DIRECTED]->(m:Movie)
    RETURN m
    ORDER BY m.year DESC
    """
    with get_driver().session() as session:
        result = session.run(query, {"person_id": person_id})
        return [record["m"] for record in result]

def get_people_by_movie_tmdb_id(tmdb_id: int) -> List[dict]:
    query = """
    MATCH (p:Person)-[r]->(m:Movie {tmdb_id: $tmdb_id})
    WHERE type(r) IN ['ACTED_IN', 'DIRECTED']
    RETURN p, type(r) AS role
    """
    with get_driver().session() as session:
        result = session.run(query, {"tmdb_id": tmdb_id})
        return [{
            "tmdb_id": record["p"].get("tmdb_id"),
            "name": record["p"].get("name"),
            "photo_url": f"https://image.tmdb.org/t/p/w500{record['p'].get('profile_path')}" if record["p"].get("profile_path") else None,
            "role": record["role"]
        } for record in result]