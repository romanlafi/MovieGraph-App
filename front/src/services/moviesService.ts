import {Movie} from "../types/movie.ts";
import axios from "axios";
import {API_ENDPOINTS} from "../data/apiConstants.ts";
import {Genre} from "../types/genre.ts";

const API_MOVIES = API_ENDPOINTS.MOVIES;

export const getGenres = async (): Promise<Genre[]> => {
    const res = await axios.get(`${API_MOVIES}/genres`);
    return res.data;
}

export const getMoviesByGenre = async (
    genre_name: string,
    page = 1,
    limit = 10
): Promise<Movie[]> => {
    const res = await axios.get<Movie[]>(`${API_MOVIES}/by_genre`, {
        params: {
            genre_name,
            page,
            limit
        },
    });
    return res.data;
}

export const getMovieById = async (movie_id: string): Promise<Movie> => {
    const res = await axios.get<Movie>(API_MOVIES, {
        params: { movie_id }
    });
    return res.data;
}

export const getMovieByTmdbId = async (tmdb_id: string): Promise<Movie> => {
    const res = await axios.get(`${API_MOVIES}/detail`, {
        params: { tmdb_id },
    });
    return res.data;
};

export const getRelatedMovies = async (movie_id: string): Promise<Movie[]> => {
    const res = await axios.get<Movie[]>(`${API_MOVIES}/related`, {
        params: { movie_id },
    });
    return res.data;
};

export const searchTmdbMovies = async (query: string): Promise<Movie[]> => {
    const res = await axios.get(`${API_MOVIES}/tmdb_search`, {
        params: { query },
    });
    return res.data;
};

export const getUserLikes = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("No authorization token");
    }

    const res = await axios.get(
        `${API_MOVIES}/likes`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            }
        }
    );
    return Array.isArray(res.data) ? res.data : [];
};

export const likeMovie = async (movieId: string) => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("No authorization token");
    }

    const res = await axios.post(
        `${API_MOVIES}/like`,
        null,
        {
            params: { movie_id: movieId },
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            }
        }
    );
    return res.data;
};

export const unlikeMovie = async (movieId: string) => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("No authorization token");
    }

    const res = await axios.delete(
        `${API_MOVIES}/like`,
        {
            params: { movie_id: movieId },
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            }
        }
    );
    return res.data;
};