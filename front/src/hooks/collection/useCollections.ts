import {useEffect, useState} from "react";
import type {Collection} from "@/types/collection.ts";
import {getCollections} from "@/services/moviesService.ts";

const PAGE_SIZE = 5;

export function useCollections() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);
        setCollections([]);
        setVisibleCount(PAGE_SIZE);
        void getCollections(controller.signal)
            .then(results => {
                if (!controller.signal.aborted) setCollections(results);
            })
            .catch(() => {
                if (!controller.signal.aborted) setError("Couldn't load collections. Please try again.");
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [attempt]);

    const loadMore = () => setVisibleCount(current => Math.min(current + PAGE_SIZE, collections.length));
    const retry = () => setAttempt(current => current + 1);

    return {
        visibleCollections: collections.slice(0, visibleCount),
        loading,
        error,
        hasMore: visibleCount < collections.length,
        loadMore,
        retry,
    };
}
