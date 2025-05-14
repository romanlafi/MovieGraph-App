import {useParams} from "react-router-dom";

import MovieGrid from "../components/movie/MovieGrid.tsx";
import LoadingSpinner from "../components/layout/LoadingSpinner.tsx";
import Button from "../components/common/Button.tsx";
import Container from "../components/common/Container.tsx";
import Title from "../components/common/Title.tsx";

import {genreDescriptions} from "../data/genreDescriptions.ts";
import {useMoviesByGenre} from "../hooks/useMoviesByGenre.ts";


export default function GenrePage() {
    const { genre } = useParams<{ genre: string }>();
    const { movies, loading, loadMore, loadingMore } = useMoviesByGenre(genre ?? "");

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
                {genre && genreDescriptions[genre] && (
                    <p className="text-white/70 text-sm">{genreDescriptions[genre]}</p>
                )}
                <MovieGrid movies={movies} />
                <div className="flex justify-center">
                    <Button onClick={loadMore} disabled={loadingMore}>
                        Load More
                    </Button>
                </div>
            </section>
        </Container>
    );
}