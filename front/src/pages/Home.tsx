import {useEffect, useState} from "react";
import {getGenres, getMoviesByGenre, getUserLikes} from "../services/moviesService.ts";

import {Movie} from "../types/movie.ts";
import {Genre} from "../types/genre.ts";

import MovieCarousel from "../components/movie/MovieCarousel.tsx";
import LoadingSpinner from "../components/layout/LoadingSpinner.tsx";
import Container from "../components/common/Container.tsx";
import Button from "../components/common/Button.tsx";

import {useAuth} from "../hooks/useAuth.tsx";
import {genreDescriptions} from "../data/genreDescriptions.ts";


export default function Home() {
    const { token } = useAuth();

    const [allGenres, setAllGenres] = useState<Genre[]>([]);
    const [visibleGenres, setVisibleGenres] = useState<Genre[]>([]);
    const [genreMovies, setGenreMovies] = useState<Record<string, Movie[]>>({});
    const [userLikes, setUserLikes] = useState<Movie[]>([]);

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
    }, [visibleCount]);

    useEffect(() => {
        const fetchMovies = async () => {
            const result: Record<string, Movie[]> = {};

            for (const genre of visibleGenres) {
                if (!genreMovies[genre.id]) {
                    try {
                        result[genre.id] = await getMoviesByGenre(genre.name);
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
    }, [genreMovies, visibleGenres]);

    const loadUserLikes = async () => {
        if (!token) return;
        try {
            const likes = await getUserLikes();
            setUserLikes(likes);
        } catch (error) {
            console.error("Error loading user likes", error);
        }
    };

    useEffect(() => {
        void loadUserLikes();
    }, [token]);

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
        <Container className="space-y-10 pb-10 mt-10">
            {visibleGenres.map((genre) => (
                <MovieCarousel
                    key={genre.id}
                    title={genre.name}
                    subtitle={genreDescriptions[genre.name] ?? ""}
                    genreLink
                    movies={genreMovies[genre.id] ?? []}
                    userLikes={userLikes}
                    onLikeChange={loadUserLikes}
                />
            ))}

            {visibleCount < allGenres.length && (
                <div className="flex justify-center">
                    <Button onClick={loadMoreGenres} disabled={loadingMore}>
                        {loadingMore ? "Loading..." : "Load More Genres"}
                    </Button>
                </div>
            )}
        </Container>
    );
}
