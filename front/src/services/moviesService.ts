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

export const getUserLikes = async (): Promise<number[]> => {
    const res = await api.get(`${API_MOVIES}likes`);
    return res.data;
};

export const likeMovie = async (tmdbMovieId: number) => {
    const res = await api.post(`${API_MOVIES}${tmdbMovieId}/like`);
    return res.data;
};

export const unlikeMovie = async (tmdbMovieId: number) => {
    const res = await api.delete(`${API_MOVIES}${tmdbMovieId}/like`);
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
