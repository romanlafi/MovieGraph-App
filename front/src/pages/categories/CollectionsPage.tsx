import {useEffect, useState} from "react";
import {Collection} from "../../types/collection.ts";
import {Movie} from "../../types/movie.ts";
import LoadingSpinner from "../../components/layout/LoadingSpinner.tsx";
import {getCollections} from "../../services/moviesService.ts";
import HeroCollection from "../../components/hero/HeroCollection.tsx";
import Container from "../../components/layout/Container.tsx";
import Button from "../../components/ui/Button.tsx";

const COLLECTIONS_PAGE_SIZE = 5;

export default function ExploreCollectionsPage() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [collectionMovies, setCollectionMovies] = useState<Record<string, Movie[]>>({});
    const [visibleCount, setVisibleCount] = useState(COLLECTIONS_PAGE_SIZE);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        const fetchCollections = async () => {
            try {
                const collectionsData = await getCollections();
                setCollections(collectionsData);
                setCollectionMovies(Object.fromEntries(collectionsData.map(collection => [collection.id, collection.movies ?? []])));
            } catch (error) {
                console.error("Error loading collections", error);
            } finally {
                setLoading(false);
            }
        };

        void fetchCollections();
    }, []);

    const handleLoadMore = () => {
        setLoadingMore(true);
        setTimeout(() => {
            setVisibleCount((prev) => prev + COLLECTIONS_PAGE_SIZE);
            setLoadingMore(false);
        }, 300); // simulamos delay suave, opcional
    };

    if (loading) return <LoadingSpinner />;

    return (
        <Container className="space-y-16 pb-10 mt-10">
            {collections.slice(0, visibleCount).map((collection) => (
                <HeroCollection
                    key={collection.id}
                    collection={collection}
                    movies={collectionMovies[collection.id] ?? []}
                />
            ))}

            {visibleCount < collections.length && (
                <div className="flex justify-center">
                    <Button onClick={handleLoadMore} disabled={loadingMore}>
                        {loadingMore ? "Loading..." : "Load More Collections"}
                    </Button>
                </div>
            )}
        </Container>
    );
}
