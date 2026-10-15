import {useCallback} from "react";
import {getMoviesByGenre} from "@/services/moviesService.ts";
import {usePaginatedMovies} from "@/hooks/movie/usePaginatedMovies.ts";

export function useMoviesByGenre(genreName: string, entriesPage = 18) {
    const fetchPage = useCallback((page: number, limit: number, signal: AbortSignal) =>
        getMoviesByGenre(genreName, page, limit, signal), [genreName]);

    return usePaginatedMovies(fetchPage, entriesPage, Boolean(genreName));
}
