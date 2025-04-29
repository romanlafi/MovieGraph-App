from typing import List

from app.graph.queries.comment import get_comments_query, create_comment_query
from app.schemas.comment import CommentResponse


def create_comment(movie_tmdb_id: int, user_email: str, text: str):
    create_comment_query(movie_tmdb_id, user_email, text)

def list_comments(movie_tmdb_id: int) -> List[CommentResponse]:
    records = get_comments_query(movie_tmdb_id)
    return [CommentResponse(**record) for record in records]