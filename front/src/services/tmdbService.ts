import {api} from "./api.ts";
import type {TmdbMovieSearchPage} from "@/types/tmdb.ts";
import {hasMoviePosterAndRating, toMovieSearchResult} from "./catalogueAdapters.ts";

export const searchTmdbMovies = async (query: string, page = 1, signal?: AbortSignal) => {
    const response = await getTmdbCatalogue<TmdbMovieSearchPage>("search/movie", {q: query, page}, signal);
    return {
        results: response.results.filter(movie => hasMoviePosterAndRating({
            poster_path: movie.poster_url,
            vote_average: movie.rating,
        })).map(toMovieSearchResult),
        page: response.page,
        totalPages: response.total_pages,
    };
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
