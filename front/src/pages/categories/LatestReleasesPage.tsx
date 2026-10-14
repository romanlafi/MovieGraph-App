import { useMemo } from "react";
import Button from "../../components/ui/Button.tsx";
import Container from "../../components/layout/Container.tsx";
import LoadingSpinner from "../../components/layout/LoadingSpinner.tsx";
import ReleaseMonthSection from "../../components/movie/ReleaseMonthSection.tsx";
import { useLatestMovies } from "../../hooks/movie/useLatestMovies.ts";
import { groupMoviesByReleaseMonth } from "../../utils/releaseCalendar.ts";

export default function LatestReleasesPage() {
    const { movies, loading, loadMore, loadingMore, hasMore } = useLatestMovies();
    const groups = useMemo(() => groupMoviesByReleaseMonth(movies), [movies]);

    if (loading) return <LoadingSpinner />;

    return (
        <Container className="space-y-8 py-10 text-ink">
            <div className="space-y-10">
                {groups.map((group) => (
                    <ReleaseMonthSection key={group.key} group={group} />
                ))}
            </div>

            {hasMore && (
                <div className="mt-4 flex justify-center">
                    <Button onClick={loadMore} disabled={loadingMore}>
                        {loadingMore ? "Loading..." : "Load More"}
                    </Button>
                </div>
            )}
        </Container>
    );
}
