import {useCallback, useEffect, useRef, useState} from "react";
import type {MovieSearchResult} from "../../types/movie.ts";
import {searchTmdbMovies} from "../../services/tmdbService.ts";

type MovieSearchStatus = "idle" | "loading" | "success" | "error";

interface MovieSearchState {
    status: MovieSearchStatus;
    results: MovieSearchResult[];
    error: string | null;
}

const INITIAL_STATE: MovieSearchState = {status: "idle", results: [], error: null};
const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function useMovieSearch() {
    const [query, setQuery] = useState("");
    const [state, setState] = useState<MovieSearchState>(INITIAL_STATE);
    const [retryCount, setRetryCount] = useState(0);
    const controllerRef = useRef<AbortController | null>(null);

    const updateQuery = useCallback((nextQuery: string) => {
        if (nextQuery === query) return;
        controllerRef.current?.abort();
        setState(INITIAL_STATE);
        setQuery(nextQuery);
    }, [query]);

    const clear = useCallback(() => updateQuery(""), [updateQuery]);

    const retry = useCallback(() => {
        controllerRef.current?.abort();
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
            setState({status: "loading", results: [], error: null});
            try {
                const results = await searchTmdbMovies(searchQuery, 1, controller.signal);
                if (controller.signal.aborted || controllerRef.current !== controller) return;
                setState({status: "success", results, error: null});
            } catch {
                if (controller.signal.aborted || controllerRef.current !== controller) return;
                setState({status: "error", results: [], error: "Couldn't search movies. Please try again."});
            }
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(timeout);
            controller.abort();
            if (controllerRef.current === controller) controllerRef.current = null;
        };
    }, [query, retryCount]);

    return {query, ...state, updateQuery, clear, retry};
}
