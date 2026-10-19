import {useCallback} from "react";
import {getPersonFilmography} from "@/services/peopleService.ts";
import {useAsyncResource} from "@/hooks/useAsyncResource.ts";
import {actedMovies, directedMovies} from "@/data/carouselCategories.ts";
import AsyncSection from "@/components/layout/AsyncSection.tsx";
import MovieCarousel from "@/components/movie/MovieCarousel.tsx";

export default function PersonFilmographySection({tmdbPersonId}: Readonly<{tmdbPersonId: number}>) {
    const load = useCallback((signal: AbortSignal) => getPersonFilmography(tmdbPersonId, signal), [tmdbPersonId]);
    const {data, loading, error, retry} = useAsyncResource(load);

    return (
        <AsyncSection title="Filmography" loading={loading} error={Boolean(error)}
            empty={!data || data.acted.length + data.directed.length === 0}
            errorMessage="Couldn't load filmography. Please try again." onRetry={retry}>
            <MovieCarousel movies={data?.directed ?? []} title={directedMovies.title} subtitle={directedMovies.subtitle} genreLink={false} />
            <MovieCarousel movies={data?.acted ?? []} title={actedMovies.title} subtitle={actedMovies.subtitle} genreLink={false} />
        </AsyncSection>
    );
}
