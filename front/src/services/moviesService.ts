import {api} from "./api.ts";
import {API_MOVIES} from "../data/apiConstants.ts";
import {Movie} from "../types/movie.ts";
import {Genre} from "../types/genre.ts";
import {Collection} from "../types/collection.ts";

export const getMoviesByGenre = async (genre_name: string, page = 1, limit = 10): Promise<Movie[]> => {
    const res = await api.get(`${API_MOVIES}by_genre`, {
        params: { genre_name, page, limit },
    });
    return res.data;
};

export const getMoviesByCollection = async (collectionId: string, page = 1, limit = 10): Promise<Movie[]> => {
    const res = await api.get(`${API_MOVIES}by_collection`, {
        params: { collection_id: collectionId, page, limit },
    });
    return res.data;
};

export const getTopRatedMovies = async (page = 1, limit = 10): Promise<Movie[]> => {
    const res = await api.get(`${API_MOVIES}top_rated`, {
        params: { page, limit },
    });
    return res.data;
};

export const getLatestMovies = async (page = 1, limit = 10): Promise<Movie[]> => {
    const res = await api.get(`${API_MOVIES}latest`, {
        params: { page, limit },
    });
    return res.data;
};

export const getRelatedMovies = async (movieId: string): Promise<Movie[]> => {
    const res = await api.get(`${API_MOVIES}related`, {
        params: { movie_id: movieId },
    });
    return res.data;
};

export const getMovieByTmdbId = async (tmdbId: string): Promise<Movie> => {
    const res = await api.get(`${API_MOVIES}detail`, {
        params: { tmdb_id: tmdbId },
    });
    return res.data;
};

export const getGenres = async (): Promise<Genre[]> => {
    const res = await api.get(`${API_MOVIES}genres`);
    return res.data;
};

export const getCollections = async (): Promise<Collection[]> => {
    const res = await api.get(`${API_MOVIES}collections`);
    return res.data;
};

export const searchTmdbMovies = async (query: string): Promise<Movie[]> => {
    const res = await api.get(`${API_MOVIES}tmdb_search`, {
        params: { query },
    });
    return res.data;
};

export const getUserLikes = async (): Promise<Movie[]> => {
    const res = await api.get(`${API_MOVIES}likes`);
    return res.data;
};

export const likeMovie = async (movieId: string) => {
    const res = await api.post(`${API_MOVIES}like`, null, {
        params: { movie_id: movieId },
    });
    return res.data;
};

export const unlikeMovie = async (movieId: string) => {
    const res = await api.delete(`${API_MOVIES}like`, {
        params: { movie_id: movieId },
    });
    return res.data;
};

export const getRandomMovies = async (limit = 5): Promise<Movie[]> => {
    const res = await api.get(`${API_MOVIES}random`, {
        params: { limit },
    });
    return res.data;
};

export const getRandomCollection = async (): Promise<Collection> => {
    const res = await api.get(`${API_MOVIES}random_collection`);
    return res.data;
};