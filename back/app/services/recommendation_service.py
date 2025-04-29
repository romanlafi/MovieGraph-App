from typing import List

from app.exceptions import UserNotFoundError
from app.graph.queries.recommendations import get_recommendations_from_friends
from app.graph.queries.user import get_user_by_email
from app.schemas.movie import MovieListResponse, movie_node_to_list_response


def recommend_from_friends(user_email: str) -> List[MovieListResponse]:
    if not get_user_by_email(user_email):
        raise UserNotFoundError()
    nodes = get_recommendations_from_friends(user_email)
    return [movie_node_to_list_response(n) for n in nodes]