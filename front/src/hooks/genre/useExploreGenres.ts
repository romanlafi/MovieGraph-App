import {useEffect, useState} from "react";
import {Genre} from "../../types/genre.ts";
import {Movie} from "../../types/movie.ts";
import {getGenres, getMoviesByGenre} from "../../services/moviesService.ts";

export function useExploreGenres() {
    const [allGenres, setAllGenres] = useState<Genre[]>([]);
    const [visibleGenres, setVisibleGenres] = useState<Genre[]>([]);
    const [genreMovies, setGenreMovies] = useState<Record<string, Movie[]>>({});
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMoreGenres, setHasMoreGenres] = useState(true);
    const ITEMS_PER_LOAD = 3; // Cambia según quieras

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const genres = await getGenres();
                setAllGenres(genres);
                const initialGenres = genres.slice(0, ITEMS_PER_LOAD);
                setVisibleGenres(initialGenres);

                const moviesByGenre = await Promise.all(
                    initialGenres.map((genre: Genre) => getMoviesByGenre(genre.name))
                );
                const moviesMap: Record<string, Movie[]> = {};
                initialGenres.forEach((genre, index) => {
                    moviesMap[genre.id] = moviesByGenre[index];
                });
                setGenreMovies(moviesMap);

                setHasMoreGenres(genres.length > ITEMS_PER_LOAD);
            } finally {
                setLoading(false);
            }
        };
        void fetchInitial();
    }, []);

    const loadMoreGenres = async () => {
        if (loadingMore || !hasMoreGenres) return;
        setLoadingMore(true);
        try {
            const nextGenres = allGenres.slice(visibleGenres.length, visibleGenres.length + ITEMS_PER_LOAD);

            if (nextGenres.length === 0) {
                setHasMoreGenres(false);
                return;
            }

            const moviesByGenre = await Promise.all(
                nextGenres.map((genre: Genre) => getMoviesByGenre(genre.name))
            );

            setVisibleGenres((prev) => [...prev, ...nextGenres]);
            setGenreMovies((prev) => {
                const updated = { ...prev };
                nextGenres.forEach((genre, index) => {
                    updated[genre.id] = moviesByGenre[index];
                });
                return updated;
            });

            if (visibleGenres.length + nextGenres.length >= allGenres.length) {
                setHasMoreGenres(false);
            }
        } finally {
            setLoadingMore(false);
        }
    };

    return {
        visibleGenres,
        genreMovies,
        loading,
        loadMoreGenres,
        loadingMore,
        hasMoreGenres,
    };
}