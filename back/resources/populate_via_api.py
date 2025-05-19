import httpx
import random
from datetime import date

BASE_URL = "http://192.168.1.175:8001/api/v1"

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
    "The Departed", "The Pianist", "The Grandmaster",
    "Star Wars: A New Hope", "The Empire Strikes Back", "Return of the Jedi",
    "The Phantom Menace", "Attack of the Clones", "Revenge of the Sith",
    "The Force Awakens", "The Last Jedi", "The Rise of Skywalker",
    "Rogue One", "Solo",

    # Nolan's Batman Trilogy
    "Batman Begins", "The Dark Knight", "The Dark Knight Rises",

    # Indiana Jones Saga
    "Raiders of the Lost Ark", "Temple of Doom", "The Last Crusade", "Kingdom of the Crystal Skull", "Dial of Destiny",

    # Jurassic Park Saga
    "Jurassic Park", "The Lost World: Jurassic Park", "Jurassic Park III",
    "Jurassic World", "Fallen Kingdom", "Dominion",

    # Pirates of the Caribbean Saga
    "The Curse of the Black Pearl", "Dead Man's Chest", "At World's End",
    "On Stranger Tides", "Dead Men Tell No Tales",

    # Mission: Impossible Saga
    "Mission: Impossible", "MI: 2", "MI: III", "Ghost Protocol", "Rogue Nation",
    "Fallout", "Dead Reckoning Part One",

    # Fast & Furious Saga
    "The Fast and the Furious", "2 Fast 2 Furious", "Tokyo Drift", "Fast & Furious",
    "Fast Five", "Fast & Furious 6", "Furious 7", "The Fate of the Furious",
    "F9", "Fast X", "Hobbs & Shaw",

    # Transformers Saga
    "Transformers", "Revenge of the Fallen", "Dark of the Moon",
    "Age of Extinction", "The Last Knight", "Bumblebee", "Rise of the Beasts",

    # Rocky & Creed Saga
    "Rocky", "Rocky II", "Rocky III", "Rocky IV", "Rocky V", "Rocky Balboa",
    "Creed", "Creed II", "Creed III",

    # Spider-Man (Sam Raimi)
    "Spider-Man", "Spider-Man 2", "Spider-Man 3",

    # The Amazing Spider-Man
    "The Amazing Spider-Man", "The Amazing Spider-Man 2",

    # X-Men Saga
    "X-Men", "X2", "The Last Stand", "First Class", "Days of Future Past",
    "Apocalypse", "Dark Phoenix", "The Wolverine", "Logan", "Deadpool", "Deadpool 2",

    # John Wick Saga
    "John Wick", "John Wick: Chapter 2", "John Wick: Chapter 3 - Parabellum", "John Wick: Chapter 4",

    # Mad Max Saga
    "Mad Max", "The Road Warrior", "Beyond Thunderdome", "Fury Road", "Furiosa",

    # Alien Saga
    "Alien", "Aliens", "Alien 3", "Alien: Resurrection", "Prometheus", "Alien: Covenant",

    # Predator Saga
    "Predator", "Predator 2", "Predators", "The Predator", "Prey",

    # Pixar classics
    "Toy Story", "Toy Story 2", "Toy Story 3", "Toy Story 4",
    "Monsters, Inc.", "Monsters University",
    "Finding Nemo", "Finding Dory",
    "Up", "Inside Out", "Coco", "Soul", "Luca", "Turning Red", "Elemental",
    "Ratatouille", "The Incredibles", "The Incredibles 2", "Cars", "Cars 2", "Cars 3",
    "WALL·E", "Brave", "Onward", "Lightyear",

    # Dreamworks classics
    "Shrek", "Shrek 2", "Shrek the Third", "Shrek Forever After", "Puss in Boots", "Puss in Boots: The Last Wish",
    "Kung Fu Panda", "Kung Fu Panda 2", "Kung Fu Panda 3", "How to Train Your Dragon", "How to Train Your Dragon 2",
    "How to Train Your Dragon: The Hidden World",
    "Madagascar", "Madagascar: Escape 2 Africa", "Madagascar 3: Europe's Most Wanted",

    # Disney Animation classics
    "Frozen", "Frozen II", "Moana", "Zootopia", "Raya and the Last Dragon", "Encanto", "Big Hero 6",
    "Tangled", "The Princess and the Frog", "Lilo & Stitch", "Wreck-It Ralph", "Ralph Breaks the Internet",

    # Other modern hits and classics
    "Gravity", "The Martian", "Edge of Tomorrow", "Pacific Rim", "Dune Part One", "Dune Part Two",
    "The Shape of Water", "Birdman", "The Favourite", "Jojo Rabbit", "1917", "Once Upon a Time in Hollywood",
    "The Lighthouse", "Uncut Gems", "Barbie", "Poor Things", "Anatomy of a Fall", "The Zone of Interest", "Past Lives",
    "The Matrix Reloaded",
    "The Matrix Revolutions",
    "The Matrix Resurrections",
    "The Animatrix",
    "The Godfather Part II",
    "The Godfather Part III",
    "The Hobbit: An Unexpected Journey",
    "The Hobbit: The Desolation of Smaug",
    "The Hobbit: The Battle of the Five Armies",
    "Star Wars: The Force Awakens",
    "Star Wars: The Last Jedi",
    "Star Wars: The Rise of Skywalker",
    "Deadpool 2",
    "Spider-Man: Across the Spider-Verse",
    "Ant-Man and the Wasp",
    "Ant-Man and the Wasp: Quantumania",
    "Guardians of the Galaxy Vol. 2",
    "Guardians of the Galaxy Vol. 3",
    "Doctor Strange in the Multiverse of Madness",
    "Thor: Love and Thunder",
    "Black Panther: Wakanda Forever",
    "Fantastic Four",
    "Fantastic Four: Rise of the Silver Surfer",
    "Fantastic Four (2015)",
    "Inside Out 2",
    "Kung Fu Panda 4",
    "Furiosa: A Mad Max Saga",
    "Deadpool & Wolverine",
    "Joker: Folie à Deux",
    "Dune: Messiah",
    "Moana 2",
    "Gladiator 2",
    "The Lord of the Rings: The War of the Rohirrim",
    "Mufasa: The Lion King",
    "Twisters",
    "Wicked Part One",
    "The Batman Part II"
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

def create_follows():
    for sender, receiver in friendships:
        token = tokens.get(sender)
        if token:
            res = httpx.post(
                f"{BASE_URL}/follows/",
                headers={"Authorization": f"Bearer {token}"},
                json={"email": receiver}
            )
            if res.status_code == 200:
                print(f"{sender} now follows {receiver}")
            else:
                print(f"Failed to follow {receiver} by {sender}: {res.status_code} - {res.text}")

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
                id = movie["id"]
                httpx.post(
                    f"{BASE_URL}/movies/like",
                    params={"movie_id": id},
                    headers={"Authorization": f"Bearer {token}"}
                )

def search_movies_only():
    seen_tmdb_ids = set()
    for title in movie_pool:
        res = httpx.get(f"{BASE_URL}/movies/tmdb_search", params={"query": title})
        if res.status_code == 200:
            results = res.json()
            for result in results:
                tmdb_id = result.get("tmdb_id")
                if tmdb_id and tmdb_id not in seen_tmdb_ids:
                    detail_resp = httpx.get(f"{BASE_URL}/movies/detail", params={"tmdb_id": tmdb_id})
                    if detail_resp.status_code == 200:
                        print(f"Fetched and saved: {result['title']}")
                        seen_tmdb_ids.add(tmdb_id)
                        break
                else:
                    print(f"Already saved or missing tmdb_id for: {title}")
        else:
            print(f"Search failed for {title}: {res.status_code}")

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
                "movie_id": 577922,
                "text": comment_text
            }
        )

        if resp.status_code == 200:
            print(f"Inserted comment from {user['email']}")
        else:
            print(f"Failed to insert comment from {user['email']}: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    # register_and_login_users()
    # create_follows()
    search_movies_only()
    # search_and_like()
    # insert_comments()
    print("\nPoblamiento vía API completado.")
