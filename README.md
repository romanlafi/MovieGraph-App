# 🎬 MovieGraph

Migration status: the existing application still runs locally on FastAPI/PostgreSQL. The Cloudflare Python Worker exposes health and an isolated `/api/tmdb` gateway for movie search, movie detail and person detail. SearchBar uses the new gateway; detail/social screens retain the legacy API. Lazy SQLAlchemy/pg8000 database infrastructure and a separate protected development probe are prepared; real Hyperdrive/Neon connectivity is pending a development binding. No application schema or data migration has run. See the [database runtime setup](docs/DATABASE_RUNTIME.md), [database validation report](docs/DATABASE_RUNTIME_REPORT.md) and accepted [TMDB phase report](docs/TMDB_GATEWAY_REPORT.md). Read the [migration audit](docs/MIGRATION_AUDIT.md) and [current local/Worker setup](docs/LOCAL_DEVELOPMENT.md) first. Docker instructions below describe the legacy local stack, not the target production runtime.

MovieGraph is a full-stack web application that allows users to discover, follow, and interact with movies and other users. It's built using **FastAPI** (Python) for the backend, **React + TypeScript** for the frontend, and **PostgreSQL** for data storage — all orchestrated with Docker.

---

## 🧱 Tech Stack

| Layer       | Technology              |
|-------------|--------------------------|
| Frontend    | React, TypeScript, Vite, TailwindCSS |
| Backend     | FastAPI (Python)         |
| Database    | PostgreSQL               |
| Auth        | JWT-based                |
| Deployment  | Docker, Docker Compose   |

---

## 🚀 Features

- 🔐 **Authentication**: JWT-based secure login system.
- 🎞️ **Movie Catalog**: Browse and explore a collection of movies.
- 👤 **User Profiles**: Follow/unfollow other users.
- 💬 **Comments**: Add comments to movies.
- 📈 **Recommendations**: Get tailored movie suggestions.
- ❤️ **Likes & Follows**: Like movies and follow people.
- 🌐 **REST API**: All endpoints versioned under `/api/v1`.

---

## 📁 Project Structure

```
moviegraph-app/
├── back/                # FastAPI backend
│   ├── app/             # Main application logic
│   │   ├── api/v1/      # Versioned API endpoints
│   │   ├── models/      # SQLAlchemy models
│   │   ├── db/          # DB session and init
│   │   ├── deps/        # Dependencies (auth, etc.)
│   │   └── core/        # Config and security utils
│   ├── Dockerfile
│   └── requirements.txt
│
├── front/               # React frontend
│   ├── src/             # Main React app
│   │   ├── routes/      # App routes
│   │   ├── components/  # UI components
│   │   ├── contexts/    # Context providers (Auth, Likes, etc.)
│   │   └── App.tsx
│   ├── Dockerfile
│   └── index.html
│
└── docker-compose.yml  # Dev environment orchestration
```

---

## 🐳 Getting Started with Docker

### Prerequisites

- Docker & Docker Compose

### Run the App

```bash
docker-compose up --build
```

### Available Services

| Service   | URL                     |
|-----------|--------------------------|
| Frontend  | `http://localhost:3000`  |
| Backend   | `http://localhost:8000/docs` |
| Database  | `localhost:5432` (PostgreSQL) |

---

## 📬 API Overview

All API endpoints are grouped and versioned under `/api/v1/`:

- `GET /api/v1/movies`
- `POST /api/v1/users/login`
- `POST /api/v1/comments`
- `GET /api/v1/recommendations`
- ... and more

Interactive documentation is available at `/docs` (Swagger UI).

---

## 📌 Notes

- CORS is enabled for all origins in development.
- Make sure to define environment variables in the `.env` files (see `back/.env` and `front/.env`).
