import {useCallback} from "react";
import {getGenres, getMoviesByTmdbGenreId} from "@/services/moviesService.ts";
import {usePaginatedMovies} from "@/hooks/movie/usePaginatedMovies.ts";
import {useAsyncResource} from "@/hooks/useAsyncResource.ts";

export function useMoviesByGenre(genreName: string, entriesPage = 18) {
    const genreResource = useAsyncResource(genreName ? getGenres : null);
    const {data: genres, loading: loadingGenres, error: genreError, retry: retryGenres} = genreResource;
    const genreId = genres?.find(genre =>
        genre.name.toLowerCase() === genreName.toLowerCase(),
    )?.tmdbId ?? null;
    const fetchPage = useCallback((page: number, limit: number, signal: AbortSignal) =>
        genreId === null ? Promise.resolve([]) : getMoviesByTmdbGenreId(genreId, page, limit, signal), [genreId]);
    const moviePages = usePaginatedMovies(fetchPage, entriesPage, genreId !== null);
    const {loadMore: loadMoreMovies} = moviePages;
    const loadMore = useCallback(async () => {
        if (genreError) {
            retryGenres();
            return;
        }
        await loadMoreMovies();
    }, [genreError, retryGenres, loadMoreMovies]);

    return {
        ...moviePages,
        loading: loadingGenres || moviePages.loading,
        error: genreError ? "Couldn't load movies. Please try again." : moviePages.error,
        hasMore: genreError ? true : moviePages.hasMore,
        loadMore,
    };
}
