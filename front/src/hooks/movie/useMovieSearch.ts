import {useCallback, useEffect, useRef, useState} from "react";
import type {MovieSearchResult} from "@/types/movie.ts";
import {searchTmdbMovies} from "@/services/tmdbService.ts";

type MovieSearchStatus = "idle" | "loading" | "success" | "error";

interface MovieSearchState {
    status: MovieSearchStatus;
    results: MovieSearchResult[];
    error: string | null;
    page: number;
    totalPages: number;
    loadingMore: boolean;
    loadMoreError: string | null;
}

const INITIAL_STATE: MovieSearchState = {
    status: "idle", results: [], error: null, page: 0, totalPages: 0, loadingMore: false, loadMoreError: null,
};
const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function useMovieSearch() {
    const [query, setQuery] = useState("");
    const [state, setState] = useState<MovieSearchState>(INITIAL_STATE);
    const [retryCount, setRetryCount] = useState(0);
    const controllerRef = useRef<AbortController | null>(null);
    const loadingMoreRef = useRef(false);

    const updateQuery = useCallback((nextQuery: string) => {
        if (nextQuery === query) return;
        controllerRef.current?.abort();
        loadingMoreRef.current = false;
        setState(INITIAL_STATE);
        setQuery(nextQuery);
    }, [query]);

    const clear = useCallback(() => updateQuery(""), [updateQuery]);

    const retry = useCallback(() => {
        controllerRef.current?.abort();
        loadingMoreRef.current = false;
        setState(INITIAL_STATE);
        setRetryCount(current => current + 1);
    }, []);

    useEffect(() => {
        const searchQuery = query.trim();
        if (searchQuery.length < MIN_QUERY_LENGTH) return;

        const controller = new AbortController();
        controllerRef.current = controller;
        const timeout = setTimeout(async () => {
            if (controller.signal.aborted) return;
            setState({...INITIAL_STATE, status: "loading"});
            try {
                const response = await searchTmdbMovies(searchQuery, 1, controller.signal);
                if (controller.signal.aborted || controllerRef.current !== controller) return;
                setState({...INITIAL_STATE, status: "success", results: response.results,
                    page: response.page, totalPages: response.totalPages});
            } catch {
                if (controller.signal.aborted || controllerRef.current !== controller) return;
                setState({...INITIAL_STATE, status: "error", error: "Couldn't search movies. Please try again."});
            }
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(timeout);
            controller.abort();
            if (controllerRef.current === controller) controllerRef.current = null;
        };
    }, [query, retryCount]);

    const loadMore = useCallback(async () => {
        if (loadingMoreRef.current || state.status !== "success" || state.page >= state.totalPages) return;
        loadingMoreRef.current = true;
        const controller = new AbortController();
        controllerRef.current = controller;
        setState(current => ({...current, loadingMore: true, loadMoreError: null}));
        try {
            const response = await searchTmdbMovies(query.trim(), state.page + 1, controller.signal);
            if (controller.signal.aborted || controllerRef.current !== controller) return;
            setState(current => ({...current, results: [...current.results, ...response.results],
                page: response.page, totalPages: response.totalPages, loadingMore: false}));
        } catch {
            if (controller.signal.aborted || controllerRef.current !== controller) return;
            setState(current => ({...current, loadingMore: false,
                loadMoreError: "Couldn't load more movies. Please try again."}));
        } finally {
            if (controllerRef.current === controller) controllerRef.current = null;
            loadingMoreRef.current = false;
        }
    }, [query, state.page, state.status, state.totalPages]);

    const retryMore = useCallback(() => {
        setState(current => ({...current, loadMoreError: null}));
        void loadMore();
    }, [loadMore]);

    return {query, ...state, updateQuery, clear, retry, loadMore, retryMore,
        hasMore: state.page < state.totalPages};
}
