import {useEffect, useState} from "react";
import {Movie} from "../../types/movie.ts";
import {getTopRatedMovies} from "../../services/moviesService.ts";

const PAGE_SIZE = 10;

export function useTopRatedMovies() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            const res = await getTopRatedMovies(1, PAGE_SIZE);
            setMovies(res);
            setHasMore(res.length === PAGE_SIZE);
            setLoading(false);
        };
        void fetch();
    }, []);

    const loadMore = async () => {
        setLoadingMore(true);
        const res = await getTopRatedMovies(page + 1, PAGE_SIZE);
        setMovies(prev => [...prev, ...res]);
        setPage(prev => prev + 1);
        setHasMore(res.length === PAGE_SIZE);
        setLoadingMore(false);
    };

    return { movies, loading, loadMore, loadingMore, hasMore };
}