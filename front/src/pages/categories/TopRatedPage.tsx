import {useTopRatedMovies} from "../../hooks/movie/useTopRatedMovies.ts";
import LoadingSpinner from "../../components/ui/LoadingSpinner.tsx";
import Container from "../../components/layout/Container.tsx";
import MoviePagination from "../../components/movie/MoviePagination.tsx";
import MovieRanking from "../../components/movie/MovieRanking.tsx";

export default function TopRatedPage() {
    const {movies, loading, loadMore, loadingMore, hasMore, error} = useTopRatedMovies();

    if (loading) return <LoadingSpinner />;

    return (
        <Container className="space-y-10 py-10 text-ink">
            <MovieRanking movies={movies} />
            {movies.length === 0 && !error && (
                <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted">
                    No top-rated movies are available right now.
                </p>
            )}
            <MoviePagination error={error} hasMore={hasMore} loadingMore={loadingMore} loadMore={loadMore} />
        </Container>
    );
}
