import {useEffect, useState} from "react";
import {Genre} from "../types/genre.ts";
import {Movie} from "../types/movie.ts";
import {getGenres, getMoviesByGenre} from "../services/moviesService.ts";

export function useExploreGenres(initialCount: number = 5) {
    const [allGenres, setAllGenres] = useState<Genre[]>([]);
    const [genreMovies, setGenreMovies] = useState<Record<string, Movie[]>>({});
    const [visibleCount, setVisibleCount] = useState(initialCount);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const genres = await getGenres();
                setAllGenres(genres);

                const moviesByGenre: Record<string, Movie[]> = {};
                for (const genre of genres.slice(0, initialCount)) {
                    moviesByGenre[genre.id] = await getMoviesByGenre(genre.name);
                }

                setGenreMovies(moviesByGenre);
            } catch (error) {
                console.error("Error fetching data", error);
            } finally {
                setLoading(false);
            }
        };

        void fetchAll();
    }, []);

    const loadMoreGenres = async () => {
        const next = visibleCount + 5;
        setLoadingMore(true);
        try {
            const moreGenres = allGenres.slice(visibleCount, next);
            const moreMovies: Record<string, Movie[]> = {};
            for (const genre of moreGenres) {
                moreMovies[genre.id] = await getMoviesByGenre(genre.name);
            }
            setGenreMovies((prev) => ({ ...prev, ...moreMovies }));
            setVisibleCount(next);
        } catch (error) {
            console.error("Error loading more genres", error);
        } finally {
            setLoadingMore(false);
        }
    };

    const visibleGenres = allGenres.slice(0, visibleCount);

    return { allGenres, genreMovies, visibleGenres, loading, loadingMore, loadMoreGenres };
}