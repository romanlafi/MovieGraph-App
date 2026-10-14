import LoadingSpinner from "../../components/layout/LoadingSpinner.tsx";
import HeroCollection from "../../components/hero/HeroCollection.tsx";
import Container from "../../components/layout/Container.tsx";
import ErrorState from "../../components/ui/ErrorState.tsx";
import LoadMoreButton from "../../components/ui/LoadMoreButton.tsx";
import {useCollections} from "../../hooks/collection/useCollections.ts";

export default function ExploreCollectionsPage() {
    const {visibleCollections, loading, error, hasMore, loadMore, retry} = useCollections();

    if (loading) return <LoadingSpinner />;

    return (
        <Container className="space-y-16 pb-10 mt-10">
            {error && <ErrorState message={error} onRetry={retry} />}
            {!error && visibleCollections.length === 0 && (
                <p className="text-center text-muted">No collections are available right now.</p>
            )}
            {visibleCollections.map((collection) => (
                <HeroCollection
                    key={collection.tmdbId}
                    collection={collection}
                    movies={collection.movies ?? []}
                />
            ))}

            {hasMore && <LoadMoreButton onClick={loadMore} label="Load More Collections" />}
        </Container>
    );
}
