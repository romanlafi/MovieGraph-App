import {useLatestMovies} from "../../hooks/movie/useLatestMovies.ts";
import MovieHorizontalCard from "../../components/movie/MovieHorizontalCard.tsx";
import LoadingSpinner from "../../components/layout/LoadingSpinner.tsx";
import Container from "../../components/layout/Container.tsx";
import Button from "../../components/ui/Button.tsx";

export default function LatestReleasesPage() {
    const { movies, loading, loadMore, loadingMore, hasMore } = useLatestMovies();

    if (loading) return <LoadingSpinner />;

    return (
        <Container className="space-y-6 py-10 text-white">
            <div className="space-y-4">
                {movies.map((movie, index) => (
                    <MovieHorizontalCard
                        key={movie.tmdb_id}
                        movie={movie}
                        position={index + 1}
                    />
                ))}
            </div>

            {hasMore && (
                <div className="flex justify-center mt-4">
                    <Button onClick={loadMore} disabled={loadingMore}>
                        {loadingMore ? "Loading..." : "Load More"}
                    </Button>
                </div>
            )}
        </Container>
    );
}