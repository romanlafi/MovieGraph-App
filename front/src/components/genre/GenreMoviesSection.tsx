import {useCallback, useEffect} from "react";
import type {Genre} from "@/types/genre.ts";
import {getRandomMoviesForGenre} from "@/services/genreMoviesService.ts";
import {useAsyncResource} from "@/hooks/useAsyncResource.ts";
import {genreDescriptions} from "@/data/genreDescriptions.ts";
import AsyncSection from "@/components/layout/AsyncSection.tsx";
import MovieCarousel from "@/components/movie/MovieCarousel.tsx";

interface GenreMoviesSectionProps {
    genre: Genre;
    onLoadingChange: (tmdbGenreId: number, loading: boolean) => void;
}

export default function GenreMoviesSection({genre, onLoadingChange}: Readonly<GenreMoviesSectionProps>) {
    const load = useCallback((signal: AbortSignal) => getRandomMoviesForGenre(genre.tmdbId, signal), [genre.tmdbId]);
    const {data, loading, error, retry} = useAsyncResource(load);

    useEffect(() => {
        onLoadingChange(genre.tmdbId, loading);
        return () => onLoadingChange(genre.tmdbId, false);
    }, [genre.tmdbId, loading, onLoadingChange]);

    return (
        <AsyncSection title={genre.name} loading={loading} error={Boolean(error || data?.partialError)}
            empty={!data?.movies.length} errorMessage={`Couldn't load all movies for ${genre.name}. Please try again.`}
            emptyMessage="No movies are available for this genre." onRetry={retry}>
            <MovieCarousel movies={data?.movies ?? []} title={genre.name} subtitle={genreDescriptions[genre.name] ?? ""} genreLink />
        </AsyncSection>
    );
}
