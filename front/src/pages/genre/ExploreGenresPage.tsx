import LoadingSpinner from "../../components/layout/LoadingSpinner.tsx";
import LoadMoreButton from "../../components/ui/LoadMoreButton.tsx";
import ErrorState from "../../components/ui/ErrorState.tsx";
import Container from "../../components/layout/Container.tsx";
import GenreMoviesSection from "../../components/genre/GenreMoviesSection.tsx";
import {useExploreGenres} from "../../hooks/genre/useExploreGenres.ts";

export default function ExploreGenresPage() {
    const {visibleGenres, loading, error, retry, loadMoreGenres, loadingMore, hasMoreGenres, setGenreLoading} = useExploreGenres();

    if (loading) return <LoadingSpinner />;

    return (
        <Container className="space-y-10 pb-10 mt-10">
            {Boolean(error) && <ErrorState message="Couldn't load genres. Please try again." onRetry={retry} />}
            {!error && visibleGenres.length === 0 && <p className="text-center text-muted">No genres are available right now.</p>}
            {visibleGenres.map(genre => (
                <GenreMoviesSection key={genre.tmdbId} genre={genre} onLoadingChange={setGenreLoading} />
            ))}
            {hasMoreGenres && <LoadMoreButton onClick={loadMoreGenres} loading={loadingMore} label="Load More Genres" />}
        </Container>
    );
}
