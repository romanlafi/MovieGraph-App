from typing import List

from sqlalchemy.orm import Session

from app.models.movie import Movie
from app.models.user import User
from app.schemas.movie import MovieListResponse, movie_to_list_response


def get_friend_recommendations(db: Session, user_email: str) -> List[MovieListResponse]:
    user = db.query(User).filter(User.email == user_email).first()
    friend_ids = [f.id for f in user.friends]
    liked_by_friends = db.query(Movie).join(Movie.liked_by).filter(User.id.in_(friend_ids)).all()

    recommended = []
    liked_ids = {m.id for m in user.likes}
    for movie in liked_by_friends:
        if movie.id not in liked_ids:
            recommended.append(movie)

    return [movie_to_list_response(m) for m in recommended[:20]]