import httpx
import random
from datetime import date

BASE_URL = "http://localhost:8000/api/v1"

users = [
    {
        "email": f"user{i}@test.com",
        "username": f"User{i}",
        "password": "test123",
        "birthdate": "1990-01-01",
        "bio": f"Bio for User{i}",
        "favorite_genres": ["Drama", "Action"] if i % 2 == 0 else ["Sci-Fi", "Romance"]
    }
    for i in range(1, 21)
]

friendships = [
    ("user1@test.com", "user2@test.com"),
    ("user1@test.com", "user3@test.com"),
    ("user2@test.com", "user4@test.com"),
    ("user3@test.com", "user5@test.com"),
    ("user4@test.com", "user6@test.com"),
    ("user5@test.com", "user7@test.com"),
    ("user6@test.com", "user8@test.com"),
    ("user7@test.com", "user9@test.com"),
    ("user8@test.com", "user10@test.com")
]

movie_pool = [
    "The Matrix", "Inception", "Fight Club", "Pulp Fiction", "Amélie", "Her",
    "The Godfather", "Goodfellas", "Interstellar", "The Prestige", "Whiplash",
    "The Dark Knight", "Memento", "The Grand Budapest Hotel", "Parasite",
    "Forrest Gump", "Gladiator", "The Lion King", "The Shawshank Redemption",
    "The Lord of the Rings: The Fellowship of the Ring", "The Two Towers", "The Return of the King",
    "Avatar", "Titanic", "The Social Network", "Black Swan", "Joker", "La La Land",
    "Django Unchained", "The Hateful Eight", "The Revenant", "Blade Runner", "Blade Runner 2049",
    "Arrival", "Ex Machina", "The Imitation Game", "The Theory of Everything",
    "Oppenheimer", "Tenet", "The Batman", "Logan", "Deadpool", "Doctor Strange",
    "Iron Man", "Captain America: Civil War", "Avengers: Endgame", "Infinity War",
    "Guardians of the Galaxy", "Thor: Ragnarok", "Ant-Man", "Black Panther",
    "Spider-Man: No Way Home", "Into the Spider-Verse", "The Flash", "Aquaman",
    "Shazam!", "Man of Steel", "The Suicide Squad", "Wonder Woman",
    "The Hunger Games", "Catching Fire", "Mockingjay", "Divergent", "Insurgent",
    "Maze Runner", "The Scorch Trials", "The Death Cure", "Harry Potter and the Philosopher's Stone",
    "Chamber of Secrets", "Prisoner of Azkaban", "Goblet of Fire", "Order of the Phoenix",
    "Half-Blood Prince", "Deathly Hallows Part 1", "Part 2",
    "Fantastic Beasts", "Crimes of Grindelwald", "Secrets of Dumbledore",
    "The Fault in Our Stars", "The Perks of Being a Wallflower", "500 Days of Summer",
    "Me Before You", "A Star Is Born", "Bohemian Rhapsody", "Rocketman",
    "The Irishman", "Knives Out", "Glass Onion", "Everything Everywhere All at Once",
    "No Country for Old Men", "The Big Short", "The Wolf of Wall Street",
    "The Departed", "The Pianist", "The Grandmaster"
]

likes = {
    user["email"]: random.sample(movie_pool, k=random.randint(2, 5))
    for user in users
}

COMMENTS = [
    "¡Increíble película!",
    "Me ha gustado bastante.",
    "La fotografía es espectacular.",
    "La actuación fue de 10.",
    "El guión flojea un poco pero buena peli.",
    "Una obra de arte, sin duda.",
    "No me convenció el final.",
    "Me sorprendió para bien.",
    "Una película muy emotiva.",
    "La banda sonora es brutal.",
    "Esperaba más la verdad.",
    "Gran dirección y grandes actuaciones.",
    "Perfecta para verla más de una vez.",
    "Un clásico moderno.",
    "Muy recomendable para todos."
]

tokens = {}

def register_and_login_users():
    for user in users:
        # register_resp = httpx.post(
        #     f"{BASE_URL}/users/",
        #     headers={"Content-Type": "application/json"},
        #     json=user
        # )
        # if register_resp.status_code == 200:
        #     print(f"Register completed {user['email']}")
        # else:
        #     print(f"Failed to register {user['email']}: {register_resp.text}")


        login_resp = httpx.post(f"{BASE_URL}/users/login", data={
            "username": user["email"],
            "password": user["password"]
        })
        if login_resp.status_code == 200:
            tokens[user["email"]] = login_resp.json()["access_token"]
            print(f"Successfully logged {user['email']}")
        else:
            print(f"Failed to login {user['email']}: {login_resp.text}")

def create_friendships():
    for sender, receiver in friendships:
        token = tokens.get(sender)
        if token:
            create_friendship_resp = httpx.post(
                f"{BASE_URL}/friends/",
                headers={"Authorization": f"Bearer {token}"},
                json={"email": receiver}
            )
            if create_friendship_resp.status_code == 200:
                print(f"Friendship created {sender} - {receiver}")
            else:
                print(f"Failed to create friendship {sender} - {receiver}: {create_friendship_resp.text}")

def search_and_like():
    for email, movie_titles in likes.items():
        token = tokens.get(email)
        if not token:
            continue

        for title in movie_titles:
            res = httpx.get(
                f"{BASE_URL}/movies/search",
                params={"query": title, "limit": 1},
                headers={"Authorization": f"Bearer {token}"}
            )
            if res.status_code == 200 and res.json():
                print(f"Successfully searched movie {title}")
                movie = res.json()[0]
                tmdb_id = movie["tmdb_id"]
                httpx.post(
                    f"{BASE_URL}/movies/like",
                    params={"tmdb_id": tmdb_id},
                    headers={"Authorization": f"Bearer {token}"}
                )

def search_movies_only():
    for title in movie_pool:
        res = httpx.get(
            f"{BASE_URL}/movies/search",
            params={"query": title, "limit": 1}
        )
        if res.status_code == 200:
            print(f"Searched and registered movie: {title}")
        else:
            print(f"Failed to search movie {title}: {res.text}")

def insert_comments():
    selected_users = random.sample(users, 15)  # Escogemos 15 usuarios distintos

    for i, user in enumerate(selected_users):
        token = tokens.get(user["email"])
        if not token:
            print(f"Skipping {user['email']} - not logged in.")
            continue

        comment_text = COMMENTS[i % len(COMMENTS)]
        resp = httpx.post(
            f"{BASE_URL}/comments/",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={  # Ahora usamos JSON, no data
                "tmdb_id": 577922,
                "text": comment_text
            }
        )

        if resp.status_code == 200:
            print(f"Inserted comment from {user['email']}")
        else:
            print(f"Failed to insert comment from {user['email']}: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    register_and_login_users()
    # create_friendships()
    # search_and_like()
    # search_movies_only()
    insert_comments()
    print("\nPoblamiento vía API completado.")
