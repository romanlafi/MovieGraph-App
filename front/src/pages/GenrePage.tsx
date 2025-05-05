import {useParams} from "react-router-dom";
import {useEffect, useState} from "react";

import {Movie} from "../types/movie.ts";
import MovieGrid from "../components/movie/MovieGrid.tsx";
import {getMoviesByGenre} from "../services/moviesService.ts";

import LoadingSpinner from "../components/layout/LoadingSpinner.tsx";

import Button from "../components/common/Button.tsx";
import Container from "../components/common/Container.tsx";
import Title from "../components/common/Title.tsx";

import {genreDescriptions} from "../data/genreDescriptions.ts";


export default function GenrePage() {
    const { genre } = useParams<{ genre: string }>();

    const entriesPage = 18;
    const description = genreDescriptions[genre ?? ""] ?? "";

    const [movies, setMovies] = useState<Movie[]>([]);

    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [, setLoadingMore] = useState(false);

    useEffect(() => {
        if (!genre) return;
        setLoading(true);

        getMoviesByGenre(genre, page, entriesPage)
            .then(setMovies)
            .catch(console.error)
            .finally(
                () => setLoading(false)
            );
    }, [genre]);

    const loadMoreMovies = async () => {
        if (!genre) return;

        try {
            setLoadingMore(true);
            const moreMovies = await getMoviesByGenre(genre, page + 1, entriesPage);
            setMovies((prev) => [...prev, ...moreMovies]);
            setPage((prev) => prev + 1);
        } catch (error) {
            console.error("Error loading more movies", error);
        } finally {
            setLoadingMore(false);
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!movies.length) {
        return (
            <div className="flex justify-center items-center h-[70vh] text-white">
                No movies found for this genre.
            </div>
        );
    }

    return (
        <Container className="py-10 space-y-6" >
            <section className="bg-neutral-800 rounded-xl p-6 shadow space-y-4">
                <Title title={genre} size="lg" className="capitalize"/>
                {description && (
                    <p className="text-white/70 text-sm">
                        {description}
                    </p>
                )}
                <MovieGrid movies={movies} />
                <div className="flex justify-center">
                    <Button onClick={loadMoreMovies}>
                        Load More
                    </Button>
                </div>
            </section>
        </Container>
    );
}