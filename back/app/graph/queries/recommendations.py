from typing import List

from neo4j.graph import Node

from app.graph.driver import get_driver


def get_recommendations_from_friends(user_email: str) -> List[Node]:
    query = """
    MATCH (me:User {email: $email})-[:FRIEND]-(f:User)-[:LIKES]->(m:Movie)
    WHERE NOT (me)-[:LIKES]->(m)
    RETURN DISTINCT m
    LIMIT 30
    """
    with get_driver().session() as session:
        result = session.run(query, {"email": user_email})
        return [record["m"] for record in result]