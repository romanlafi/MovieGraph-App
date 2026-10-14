import { useMemo } from "react";
import MoviePagination from "../../components/movie/MoviePagination.tsx";
import Container from "../../components/layout/Container.tsx";
import LoadingSpinner from "../../components/layout/LoadingSpinner.tsx";
import ReleaseMonthSection from "../../components/movie/ReleaseMonthSection.tsx";
import { useLatestMovies } from "../../hooks/movie/useLatestMovies.ts";
import { groupMoviesByReleaseMonth } from "../../utils/releaseCalendar.ts";

export default function LatestReleasesPage() {
    const { movies, loading, loadMore, loadingMore, hasMore, error } = useLatestMovies();
    const groups = useMemo(() => groupMoviesByReleaseMonth(movies), [movies]);

    if (loading) return <LoadingSpinner />;

    return (
        <Container className="space-y-8 py-10 text-ink">
            <div className="space-y-10">
                {groups.map((group) => (
                    <ReleaseMonthSection key={group.key} group={group} />
                ))}
            </div>

            <MoviePagination error={error} hasMore={hasMore} loadingMore={loadingMore} loadMore={loadMore} />
        </Container>
    );
}
