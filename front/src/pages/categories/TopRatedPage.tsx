import {useTopRatedMovies} from "../../hooks/movie/useTopRatedMovies.ts";
import LoadingSpinner from "../../components/layout/LoadingSpinner.tsx";
import Container from "../../components/layout/Container.tsx";
import Button from "../../components/ui/Button.tsx";
import MovieHorizontalCard from "../../components/movie/MovieHorizontalCard.tsx";

export default function TopRatedPage() {
    const { movies, loading, loadMore, loadingMore, hasMore } = useTopRatedMovies();

    if (loading) return <LoadingSpinner />;

    return (
        <Container className="space-y-6 py-10 text-white">
            <div className="space-y-4">
                {movies.map((movie, index) => (
                    <MovieHorizontalCard
                        key={movie.tmdb_id}
                        movie={movie}
                        ranking={index < 3 ? index + 1 : undefined}
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