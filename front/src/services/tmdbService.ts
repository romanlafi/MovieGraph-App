import {api} from "./api.ts";
import type {TmdbMovieSearchResult} from "../types/tmdb.ts";

export const searchTmdbMovies = async (query: string, page = 1): Promise<TmdbMovieSearchResult[]> => {
    // The transitional API base includes /api/v1. Use the same client and host
    // for the sibling catalogue namespace without changing legacy callers.
    const baseURL = (api.defaults.baseURL ?? "/api/v1").replace(/\/api\/v1\/?$/, "");
    const res = await api.get<TmdbMovieSearchResult[]>("/api/tmdb/search/movie", {
        baseURL,
        params: {q: query, page},
    });
    return res.data;
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
