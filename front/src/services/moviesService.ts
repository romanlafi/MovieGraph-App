import {Movie} from "../types/movie.ts";
import axios from "axios";
import {API_ENDPOINTS} from "../data/apiConstants.ts";
import {Genre} from "../types/genre.ts";

const API_MOVIES = API_ENDPOINTS.MOVIES;

export const getGenres = async (): Promise<Genre[]> => {
    const res = await axios.get(`${API_MOVIES}/genres`);
    return res.data;
}

export const getMoviesByGenre = async (genre_name: string, page = 1, limit = 10): Promise<Movie[]> => {
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

export const getRelatedMovies = async (movie_id: string): Promise<Movie[]> => {
    const res = await axios.get<Movie[]>(`${API_MOVIES}/related`, {
        params: { movie_id },
    });
    return res.data;
};


