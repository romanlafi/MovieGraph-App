import {Movie} from "../types/movie.ts";
import axios from "axios";
import {API_ENDPOINTS} from "../data/apiConstants.ts";

const API_MOVIES = API_ENDPOINTS.MOVIES;

export const getGenres = async (): Promise<string[]> => {
    const res = await axios.get(`${API_MOVIES}/genres`);
    return res.data;
}

export const getMoviesByGenre = async (genre: string, page = 1, limit = 10): Promise<Movie[]> => {
    const res = await axios.get<Movie[]>(`${API_MOVIES}/by_genre`, {
        params: {
            name: genre,
            page,
            limit
        },
    });
    return res.data;
}

export const getMovieById = async (tmdb_id: string): Promise<Movie> => {
    const res = await axios.get<Movie>(API_MOVIES, {
        params: { tmdb_id }
    });
    return res.data;
}

export const getRelatedMovies = async (tmdb_id: string): Promise<Movie[]> => {
    const res = await axios.get<Movie[]>(`${API_MOVIES}/related`, {
        params: { movie_id: tmdb_id },
    });
    return res.data;
};


