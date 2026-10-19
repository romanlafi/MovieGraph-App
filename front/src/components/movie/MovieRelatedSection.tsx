import {useCallback} from "react";
import {getRelatedMovies} from "@/services/moviesService.ts";
import {useAsyncResource} from "@/hooks/useAsyncResource.ts";
import {relatedFilms} from "@/data/carouselCategories.ts";
import AsyncSection from "@/components/layout/AsyncSection.tsx";
import MovieCarousel from "./MovieCarousel.tsx";

export default function MovieRelatedSection({tmdbMovieId}: Readonly<{tmdbMovieId: number}>) {
    const load = useCallback((signal: AbortSignal) => getRelatedMovies(tmdbMovieId, signal), [tmdbMovieId]);
    const {data, loading, error, retry} = useAsyncResource(load);

    return (
        <AsyncSection title={relatedFilms.title} loading={loading} error={Boolean(error)} empty={!data?.length}
            errorMessage="Couldn't load related movies. Please try again." onRetry={retry}>
            <MovieCarousel movies={data ?? []} title={relatedFilms.title} subtitle={relatedFilms.subtitle} genreLink={false} />
        </AsyncSection>
    );
}
