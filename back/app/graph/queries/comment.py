from typing import List
from app.graph.driver import get_driver
from datetime import datetime
import uuid

def create_comment_query(movie_tmdb_id: int, user_email: str, text: str):
    query = """
    MATCH (m:Movie {tmdb_id: $tmdb_id})
    MATCH (u:User {email: $email})
    CREATE (u)-[:WROTE {
        comment_id: $comment_id,
        text: $text,
        created_at: $created_at
    }]->(m)
    """
    with get_driver().session() as session:
        session.run(query, {
            "tmdb_id": movie_tmdb_id,
            "email": user_email,
            "comment_id": str(uuid.uuid4()),
            "text": text,
            "created_at": datetime.utcnow().isoformat()
        })

def get_comments_query(movie_tmdb_id: int) -> List[dict]:
    query = """
    MATCH (u:User)-[r:WROTE]->(m:Movie {tmdb_id: $tmdb_id})
    RETURN r.comment_id AS comment_id, u.username AS username, r.text AS text, r.created_at AS created_at
    ORDER BY r.created_at DESC
    """
    with get_driver().session() as session:
        result = session.run(query, {"tmdb_id": movie_tmdb_id})
        return [{
            "comment_id": record["comment_id"],
            "username": record["username"],
            "text": record["text"],
            "created_at": record["created_at"]
        } for record in result]