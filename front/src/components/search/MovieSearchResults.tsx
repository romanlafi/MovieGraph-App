import type {ReactNode} from "react";
import type {MovieSearchResult} from "@/types/movie.ts";
import {getTmdbImageUrl} from "@/utils/tmdbImageHelper.ts";
import RatingDisplay from "@/components/ui/RatingDisplay.tsx";
import Button from "@/components/ui/Button.tsx";
import Text from "@/components/ui/Text.tsx";

interface MovieSearchResultsProps {
    results: MovieSearchResult[];
    loading: boolean;
    error: string | null;
    loadingMore: boolean;
    hasMore: boolean;
    loadMoreError: string | null;
    onSelect: (tmdbMovieId: number) => void;
    onRetry: () => void;
    onRetryMore: () => void;
}

export default function MovieSearchResults({results, loading, error, loadingMore, hasMore, loadMoreError,
    onSelect, onRetry, onRetryMore}: Readonly<MovieSearchResultsProps>) {
    let paginationStatus: ReactNode = null;
    if (loadingMore) paginationStatus = "Loading more movies...";
    else if (loadMoreError) {
        paginationStatus = (
            <button type="button" onClick={onRetryMore} className="text-accent hover:underline">
                {loadMoreError} Try again.
            </button>
        );
    } else if (hasMore) paginationStatus = "Scroll for more results";

    if (loading) return <p className="p-3 text-sm text-muted">Searching movies...</p>;

    if (error) {
        return (
            <div className="space-y-3 p-3">
                <p role="alert" className="text-sm text-red-300">{error}</p>
                <Button onClick={onRetry}>Try Again</Button>
            </div>
        );
    }

    if (results.length === 0) return <p className="p-3 text-sm text-muted">No movies found.</p>;

    return (
        <ul aria-label="Movie search results">
            {results.map(movie => (
                <li key={movie.tmdbId}>
                    <button
                        type="button"
                        onClick={() => onSelect(movie.tmdbId)}
                        className="flex items-center w-full text-left gap-3 p-2 hover:bg-card transition focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
                    >
                        <img
                            src={getTmdbImageUrl(movie.poster_url, "w185")}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-9 h-13 object-cover rounded"
                        />
                        <div className="text-sm text-ink flex-1 overflow-hidden">
                            <Text text={movie.title} className="font-semibold" truncate={true}/>
                            <div className="flex items-center justify-between text-xs text-ink/60">
                                <span>{movie.year}</span>
                                {movie.rating && <RatingDisplay rating={movie.rating} />}
                            </div>
                        </div>
                    </button>
                </li>
            ))}
            {(loadingMore || loadMoreError || hasMore) && (
                <li className="p-2 text-center text-xs text-muted">
                    {paginationStatus}
                </li>
            )}
        </ul>
    );
}
