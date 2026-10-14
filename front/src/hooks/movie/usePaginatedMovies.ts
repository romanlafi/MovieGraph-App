import {useCallback, useEffect, useRef, useState} from "react";
import type {Movie} from "../../types/movie.ts";

type MoviePageLoader = (page: number, limit: number, signal: AbortSignal) => Promise<Movie[]>;

interface PaginationSession {
    controller: AbortController;
    page: number;
    pending: boolean;
    hasMore: boolean;
}

export function usePaginatedMovies(fetchPage: MoviePageLoader, pageSize: number, enabled = true) {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(enabled);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(enabled);
    const [error, setError] = useState<string | null>(null);
    const sessionRef = useRef<PaginationSession | null>(null);

    const loadPage = useCallback(async (session: PaginationSession) => {
        if (session.pending || !session.hasMore || session.controller.signal.aborted) return;
        session.pending = true;
        const nextPage = session.page + 1;
        setError(null);
        if (nextPage === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            const results = await fetchPage(nextPage, pageSize, session.controller.signal);
            if (session.controller.signal.aborted || sessionRef.current !== session) return;

            session.page = nextPage;
            session.hasMore = results.length === pageSize;
            setMovies(previous => nextPage === 1 ? results : [...previous, ...results]);
            setHasMore(session.hasMore);
        } catch {
            if (session.controller.signal.aborted || sessionRef.current !== session) return;
            setError("Couldn't load movies. Please try again.");
        } finally {
            session.pending = false;
            if (!session.controller.signal.aborted && sessionRef.current === session) {
                setLoading(false);
                setLoadingMore(false);
            }
        }
    }, [fetchPage, pageSize]);

    useEffect(() => {
        setMovies([]);
        setError(null);
        setLoading(enabled);
        setLoadingMore(false);
        setHasMore(enabled);
        if (!enabled) return;

        const session: PaginationSession = {
            controller: new AbortController(),
            page: 0,
            pending: false,
            hasMore: true,
        };
        sessionRef.current = session;
        void loadPage(session);

        return () => {
            session.controller.abort();
            sessionRef.current = null;
        };
    }, [enabled, loadPage]);

    const loadMore = useCallback(async () => {
        const session = sessionRef.current;
        if (session) await loadPage(session);
    }, [loadPage]);

    return {movies, loading, loadMore, loadingMore, hasMore, error};
}
