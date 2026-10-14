import {useCallback, useMemo, useRef, useState} from "react";
import {getGenres} from "../../services/moviesService.ts";
import {useAsyncResource} from "../useAsyncResource.ts";

const ITEMS_PER_LOAD = 3;

export function useExploreGenres() {
    const resource = useAsyncResource(getGenres);
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_LOAD);
    const [pendingCount, setPendingCount] = useState(0);
    const pendingGenres = useRef(new Set<number>());
    const allGenres = useMemo(() => [...(resource.data ?? [])]
        .sort((left, right) => left.name.localeCompare(right.name)), [resource.data]);

    const setGenreLoading = useCallback((tmdbGenreId: number, loading: boolean) => {
        if (loading) pendingGenres.current.add(tmdbGenreId);
        else pendingGenres.current.delete(tmdbGenreId);
        setPendingCount(pendingGenres.current.size);
    }, []);

    const loadMoreGenres = () => {
        if (pendingGenres.current.size > 0) return;
        const nextGenres = allGenres.slice(visibleCount, visibleCount + ITEMS_PER_LOAD);
        if (!nextGenres.length) return;
        nextGenres.forEach(genre => pendingGenres.current.add(genre.tmdbId));
        setPendingCount(pendingGenres.current.size);
        setVisibleCount(current => current + nextGenres.length);
    };

    const retry = () => {
        setVisibleCount(ITEMS_PER_LOAD);
        pendingGenres.current.clear();
        setPendingCount(0);
        resource.retry();
    };

    return {
        visibleGenres: allGenres.slice(0, visibleCount),
        loading: resource.loading,
        error: resource.error,
        retry,
        loadMoreGenres,
        loadingMore: pendingCount > 0,
        hasMoreGenres: visibleCount < allGenres.length,
        setGenreLoading,
    };
}
