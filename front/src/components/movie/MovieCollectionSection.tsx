import {useCallback} from "react";
import type {Collection} from "@/types/collection.ts";
import {getMoviesByCollection} from "@/services/moviesService.ts";
import {useAsyncResource} from "@/hooks/useAsyncResource.ts";
import AsyncSection from "@/components/layout/AsyncSection.tsx";
import HeroCollection from "@/components/hero/HeroCollection.tsx";

export default function MovieCollectionSection({collection}: {collection: Collection}) {
    const load = useCallback((signal: AbortSignal) => getMoviesByCollection(collection.tmdbId, 1, 10, signal), [collection.tmdbId]);
    const {data, loading, error, retry} = useAsyncResource(load);

    return (
        <AsyncSection title={collection.name} loading={loading} error={Boolean(error)} empty={data === null}
            errorMessage="Couldn't load this collection. Please try again." onRetry={retry}>
            <HeroCollection collection={collection} movies={data ?? []} />
        </AsyncSection>
    );
}
