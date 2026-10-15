import {useParams} from "react-router-dom";
import MovieHeaderCard from "@/components/movie/MovieHeaderCard.tsx";
import MovieCastSection from "@/components/movie/MovieCastSection.tsx";
import MovieCollectionSection from "@/components/movie/MovieCollectionSection.tsx";
import MovieRelatedSection from "@/components/movie/MovieRelatedSection.tsx";
import MovieCommentsSection from "@/components/comment/MovieCommentsSection.tsx";
import LoadingSpinner from "@/components/ui/LoadingSpinner.tsx";
import Container from "@/components/layout/Container.tsx";
import ErrorState from "@/components/ui/ErrorState.tsx";
import NotFound from "@/pages/NotFound.tsx";
import {useMovieDetail} from "@/hooks/movie/useMovieDetail.ts";
import {parseTmdbId} from "@/utils/parseTmdbId.ts";
import {isNotFoundError} from "@/utils/apiErrors.ts";

export default function MovieDetail() {
    const {tmdbMovieId: tmdbMovieIdParam} = useParams<{tmdbMovieId: string}>();
    const tmdbMovieId = parseTmdbId(tmdbMovieIdParam);
    const {movie, loading, error, retry} = useMovieDetail(tmdbMovieId);

    if (tmdbMovieId === null || isNotFoundError(error)) return <NotFound />;
    if (loading) return <LoadingSpinner />;
    if (error) return (
        <Container className="py-10">
            <ErrorState message="Couldn't load this movie. Please try again." onRetry={retry} />
        </Container>
    );
    if (!movie) return null;

    return (
        <Container className="py-10 text-ink space-y-10">
            <MovieHeaderCard movie={movie} />
            <MovieCastSection cast={movie.cast ?? []} />
            {movie.collection && <MovieCollectionSection collection={movie.collection} />}
            <MovieRelatedSection tmdbMovieId={movie.tmdbId} />
            <MovieCommentsSection tmdbMovieId={movie.tmdbId} />
        </Container>
    );
}
