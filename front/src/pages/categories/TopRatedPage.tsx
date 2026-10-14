import { useTopRatedMovies } from "../../hooks/movie/useTopRatedMovies.ts";
import LoadingSpinner from "../../components/layout/LoadingSpinner.tsx";
import Container from "../../components/layout/Container.tsx";
import Button from "../../components/ui/Button.tsx";
import MovieHorizontalCard from "../../components/movie/MovieHorizontalCard.tsx";
import TopRatedMovieCard from "../../components/movie/TopRatedMovieCard.tsx";

export default function TopRatedPage() {
    const { movies, loading, loadMore, loadingMore, hasMore } = useTopRatedMovies();

    if (loading) return <LoadingSpinner />;

    return (
        <Container className="space-y-10 py-10 text-ink">
            {movies.length >= 3 && (
                <section aria-labelledby="top-three-heading" className="space-y-4">
                    <div className="flex items-center gap-3">
                        <h2 id="top-three-heading" className="text-xl font-bold">Top 3</h2>
                        <span className="h-px flex-1 bg-border" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        {movies.slice(0, 3).map((movie, index) => (
                            <TopRatedMovieCard
                                key={movie.tmdb_id}
                                movie={movie}
                                rank={(index + 1) as 1 | 2 | 3}
                            />
                        ))}
                    </div>
                </section>
            )}

            {movies.length > 3 && (
                <section aria-labelledby="more-ranked-heading" className="space-y-4">
                    <div className="flex items-center gap-3">
                        <h2 id="more-ranked-heading" className="text-xl font-bold">More top-rated movies</h2>
                        <span className="h-px flex-1 bg-border" />
                    </div>
                    <div className="space-y-4">
                        {movies.slice(3).map((movie, index) => (
                            <MovieHorizontalCard
                                key={movie.tmdb_id}
                                movie={movie}
                                position={index + 4}
                            />
                        ))}
                    </div>
                </section>
            )}

            {movies.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted">
                    No top-rated movies are available right now.
                </p>
            )}

            {hasMore && (
                <div className="flex justify-center">
                    <Button onClick={loadMore} disabled={loadingMore}>
                        {loadingMore ? "Loading..." : "Load More"}
                    </Button>
                </div>
            )}
        </Container>
    );
}
