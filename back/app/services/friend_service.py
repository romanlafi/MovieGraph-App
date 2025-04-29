from typing import List

from app.exceptions import UserNotFoundError
from app.graph.queries.friend import create_friendship, get_friends
from app.graph.queries.user import get_user_by_email
from app.schemas.user import UserResponse, user_node_to_response


def add_friend(current_user_email: str, friend_email: str) -> UserResponse:
    if not get_user_by_email(friend_email):
        raise UserNotFoundError()

    new_friend = create_friendship(current_user_email, friend_email)
    return user_node_to_response(new_friend)

def list_friends(user_email: str) -> List[UserResponse]:
    users = get_friends(user_email)
    return [user_node_to_response(user) for user in users]