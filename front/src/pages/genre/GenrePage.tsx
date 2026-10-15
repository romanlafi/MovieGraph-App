import {useParams} from "react-router-dom";

import MovieGrid from "../../components/movie/MovieGrid.tsx";
import LoadingSpinner from "../../components/ui/LoadingSpinner.tsx";
import MoviePagination from "../../components/movie/MoviePagination.tsx";
import Container from "../../components/layout/Container.tsx";
import Title from "../../components/ui/Title.tsx";

import {genreDescriptions} from "../../data/genreDescriptions.ts";
import {useMoviesByGenre} from "../../hooks/genre/useMoviesByGenre.ts";
import Text from "../../components/ui/Text.tsx";


export default function GenrePage() {
    const { genre } = useParams<{ genre: string }>();
    const { movies, loading, loadMore, loadingMore, hasMore, error } = useMoviesByGenre(genre ?? "");

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!movies.length && !error) {
        return (
            <div className="flex justify-center items-center h-[70vh] text-ink">
                No movies found for this genre.
            </div>
        );
    }

    return (
        <Container className="py-10 space-y-6" >
            <section className="bg-panel rounded-xl p-6 shadow space-y-4">
                <Title title={genre} size="lg" className="capitalize"/>
                {genre && genreDescriptions[genre] &&
                    <Text text={genreDescriptions[genre]} size="sm" color="white/70"/>
                }
                <MovieGrid movies={movies} />
                <MoviePagination error={error} hasMore={hasMore} loadingMore={loadingMore} loadMore={loadMore} />
            </section>
        </Container>
    );
}
