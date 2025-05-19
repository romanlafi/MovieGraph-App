# 🎬 MovieGraph

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
