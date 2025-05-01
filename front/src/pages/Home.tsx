import {useEffect, useState} from "react";
import {getGenres, getMoviesByGenre} from "../services/moviesService.ts";
import {Movie} from "../types/movie.ts";
import {genreDescriptions} from "../data/genreDescriptions.ts";
import MovieCarousel from "../components/movie/MovieCarousel.tsx";
import LoadingSpinner from "../components/layout/LoadingSpinner.tsx";
import Container from "../components/common/Container.tsx";
import Button from "../components/common/Button.tsx";
import {Genre} from "../types/genre.ts";

export default function Home() {
    const [allGenres, setAllGenres] = useState<Genre[]>([]);
    const [visibleGenres, setVisibleGenres] = useState<Genre[]>([]);
    const [genreMovies, setGenreMovies] = useState<Record<string, Movie[]>>({});
    const [visibleCount, setVisibleCount] = useState(5);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const genres = await getGenres();
                setAllGenres(genres);
                setVisibleGenres(genres.slice(0, visibleCount));
            } catch (error) {
                console.error("Error fetching genres", error);
            } finally {
                setLoading(false);
            }
        };

        void fetchGenres();
    }, []);

    useEffect(() => {
        const fetchMovies = async () => {
            const result: Record<string, Movie[]> = {};

            for (const genre of visibleGenres) {
                if (!genreMovies[genre.id]) {
                    try {
                        const movies = await getMoviesByGenre(genre.name, 1, 10);
                        result[genre.id] = movies;
                    } catch (err) {
                        console.error(`Error loading movies for genre ${genre.name}`, err);
                    }
                }
            }

            if (Object.keys(result).length > 0) {
                setGenreMovies((prev) => ({ ...prev, ...result }));
            }
        };

        void fetchMovies();
    }, [visibleGenres]);

    const loadMoreGenres = () => {
        const next = visibleCount + 5;
        setLoadingMore(true);
        setTimeout(() => {
            setVisibleCount(next);
            setVisibleGenres(allGenres.slice(0, next));
            setLoadingMore(false);
        }, 300);
    };

    if (loading) return <LoadingSpinner />;

    return (
        <Container className="space-y-10 pb-10 mt-5">
            {visibleGenres.map((genre) => (
                <MovieCarousel
                    key={genre.id}
                    title={genre.name}
                    subtitle={genreDescriptions[genre.name] ?? ""}
                    genreLink
                    movies={genreMovies[genre.id] ?? []}
                />
            ))}

            {visibleCount < allGenres.length && (
                <div className="flex justify-center pt-8">
                    <Button onClick={loadMoreGenres} disabled={loadingMore}>
                        {loadingMore ? "Loading..." : "Load More Genres"}
                    </Button>
                </div>
            )}
        </Container>
    );
}
