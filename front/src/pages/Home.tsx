import {useEffect, useState} from "react";
import {getGenres, getMoviesByGenre} from "../services/moviesService.ts";
import {Movie} from "../types/movie.ts";
import {genreDescriptions} from "../data/genreDescriptions.ts";
import MovieCarousel from "../components/movie/MovieCarousel.tsx";
import LoadingSpinner from "../components/layout/LoadingSpinner.tsx";
import Container from "../components/common/Container.tsx";

export default function Home() {
    const [genreMovies, setGenreMovies] = useState<Record<string, Movie[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const genres = await getGenres();
                const moviesByGenre: Record<string, Movie[]> = {};

                for (const genre of genres) {
                    try {
                        moviesByGenre[genre] = await getMoviesByGenre(genre);
                    } catch (err) {
                        console.error(`Error loading movies for genre ${genre}`, err);
                    }
                }

                setGenreMovies(moviesByGenre);
            } catch (error) {
                console.error("Error fetching genres ", error);
            } finally {
                setLoading(false);
            }
        };

        void fetchData();
    }, []);

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <Container className="space-y-10 pb-10 mt-5">
            {Object.entries(genreMovies).map(([genre, movies]) => (
                <MovieCarousel
                    key={genre}
                    title={genre}
                    subtitle={genreDescriptions[genre] ?? ""}
                    movies={movies}
                />
            ))}
        </Container>
    );
}
