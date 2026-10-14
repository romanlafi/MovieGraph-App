import {api} from "./api.ts";
import type {TmdbMovieSearchResult} from "../types/tmdb.ts";
import type {MovieSearchResult} from "../types/movie.ts";
import {hasMoviePosterAndRating, toMovieSearchResult} from "./catalogueAdapters.ts";

export const searchTmdbMovies = async (query: string, page = 1, signal?: AbortSignal): Promise<MovieSearchResult[]> => {
    const results = await getTmdbCatalogue<TmdbMovieSearchResult[]>("search/movie", {q: query, page}, signal);
    return results.filter(movie => hasMoviePosterAndRating({
        poster_path: movie.poster_url,
        vote_average: movie.rating,
    })).map(toMovieSearchResult);
};

export const getTmdbCatalogue = async <Response>(
    path: string,
    params?: Record<string, string | number | boolean>,
    signal?: AbortSignal,
): Promise<Response> => {
    const baseURL = (api.defaults.baseURL ?? "/api/v1").replace(/\/api\/v1\/?$/, "");
    const res = await api.get<Response>(`/api/tmdb/${path}`, {baseURL, params, signal});
    return res.data;
};
