import {useEffect, useState} from "react";
import {Movie} from "../../types/movie.ts";
import {getMoviesByGenre} from "../../services/moviesService.ts";

export function useMoviesByGenre(genreName: string, entriesPage: number = 18) {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        if (!genreName) return;
        setLoading(true);

        getMoviesByGenre(genreName, page, entriesPage)
            .then(setMovies)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [genreName]);

    const loadMore = async () => {
        try {
            setLoadingMore(true);
            const moreMovies = await getMoviesByGenre(genreName, page + 1, entriesPage);
            if (moreMovies.length < entriesPage) {
                setHasMore(false);
            }
            setMovies((prev) => [...prev, ...moreMovies]);
            setPage((prev) => prev + 1);
        } catch (error) {
            console.error("Error loading more movies", error);
        } finally {
            setLoadingMore(false);
        }
    };

    return {movies, loading, loadMore, loadingMore, hasMore};
}