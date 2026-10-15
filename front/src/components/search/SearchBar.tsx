import {useEffect, useId, useRef, useState} from "react";
import {useMovieSearch} from "../../hooks/movie/useMovieSearch.ts";
import {useNavigate} from "react-router-dom";
import TextInput from "../ui/inputs/TextInput.tsx";
import MovieSearchResults from "./MovieSearchResults.tsx";

export default function SearchBar({autoFocus = false, onSelect}: {autoFocus?: boolean; onSelect?: () => void}) {
    const {query, results, status, error, updateQuery, clear, retry, loadMore, retryMore,
        hasMore, loadingMore, loadMoreError} = useMovieSearch();
    const [showDropdown, setShowDropdown] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const statusId = useId();
    const resultsId = useId();
    const dropdownVisible = showDropdown && status !== "idle";

    const handleSelect = (tmdbMovieId: number) => {
        setShowDropdown(false);
        clear();
        navigate(`/movie/${tmdbMovieId}`);
        onSelect?.();
    };

    useEffect(() => {
        const handlePointerOutside = (event: PointerEvent) => {
            if (!dropdownRef.current?.contains(event.target as Node)) {
                setShowDropdown(false);
                clear();
            }
        };
        document.addEventListener("pointerdown", handlePointerOutside);
        return () => document.removeEventListener("pointerdown", handlePointerOutside);
    }, [clear]);

    return (
        <div
            className="relative min-w-0 w-full"
            ref={dropdownRef}
            onKeyDown={event => {
                if (event.key === "Escape") {
                    setShowDropdown(false);
                    clear();
                    dropdownRef.current?.querySelector("input")?.focus();
                }
            }}
        >
            <TextInput
                type="text"
                aria-label="Search movies"
                aria-describedby={statusId}
                aria-controls={dropdownVisible ? resultsId : undefined}
                autoFocus={autoFocus}
                placeholder="Search movies..."
                maxLength={200}
                value={query}
                onChange={event => {
                    setShowDropdown(true);
                    updateQuery(event.target.value);
                }}
            />
            <p id={statusId} role="status" aria-atomic="true" className="sr-only">
                {dropdownVisible && (status === "loading"
                    ? "Searching movies..."
                    : status === "success"
                        ? results.length ? `${results.length} movies found.` : "No movies found."
                        : "")}
            </p>

            {dropdownVisible && (
                <div id={resultsId} onScroll={event => {
                    const element = event.currentTarget;
                    if (element.scrollHeight > element.clientHeight
                        && element.scrollHeight - element.scrollTop - element.clientHeight < 48) loadMore();
                }} className="absolute top-full left-0 right-0 bg-panel border border-border mt-1 rounded shadow-lg z-50 max-h-[min(18rem,calc(100dvh-10rem))] overflow-y-auto overscroll-contain">
                    <MovieSearchResults
                        results={results}
                        loading={status === "loading"}
                        error={error}
                        loadingMore={loadingMore}
                        hasMore={hasMore}
                        loadMoreError={loadMoreError}
                        onSelect={handleSelect}
                        onRetry={retry}
                        onRetryMore={retryMore}
                    />
                </div>
            )}
        </div>
    );
}
