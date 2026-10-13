import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLatestMovies } from "../../hooks/movie/useLatestMovies.ts";
import LoadingSpinner from "../../components/layout/LoadingSpinner.tsx";
import Container from "../../components/layout/Container.tsx";
import Button from "../../components/ui/Button.tsx";
import { Movie } from "../../types/movie.ts";
import { getTmdbImageUrl } from "../../utils/tmdbImageHelper.ts";

type ReleaseGroup = { key: string; label: string; movies: Movie[] };

function getReleaseDate(movie: Movie): Date | undefined {
    if (!movie.released) return undefined;
    const date = new Date(`${movie.released.slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

function ReleaseCard({ movie }: { movie: Movie }) {
    const navigate = useNavigate();
    const date = getReleaseDate(movie);

    return (
        <button
            type="button"
            onClick={() => navigate(`/movie/${movie.tmdb_id}`)}
            className="group flex w-full items-center gap-4 rounded-xl bg-card p-3 text-left ring-1 ring-border transition hover:bg-border"
        >
            <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-canvas py-2 ring-1 ring-border">
                <span className="text-2xl font-bold leading-none text-accent">
                    {date ? date.getDate() : "—"}
                </span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {date ? date.toLocaleDateString(undefined, { weekday: "short" }) : "TBA"}
                </span>
            </div>
            <img
                src={getTmdbImageUrl(movie.poster_url, "w185")}
                alt={movie.title}
                loading="lazy"
                decoding="async"
                className="h-20 w-14 shrink-0 rounded-md object-cover"
            />
            <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink group-hover:text-accent">{movie.title}</span>
                <span className="mt-1 block text-sm text-muted">
                    {date ? date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : movie.year ?? "Release date to be announced"}
                </span>
            </span>
            {movie.rating !== undefined && movie.rating > 0 && (
                <span className="hidden shrink-0 rounded-md bg-canvas px-2 py-1 text-sm font-semibold text-accent sm:block">
                    ★ {movie.rating.toFixed(1)}
                </span>
            )}
        </button>
    );
}

export default function LatestReleasesPage() {
    const { movies, loading, loadMore, loadingMore, hasMore } = useLatestMovies();
    const groups = useMemo(() => {
        const grouped = new Map<string, ReleaseGroup>();
        for (const movie of movies) {
            const date = getReleaseDate(movie);
            const key = date ? `${date.getFullYear()}-${date.getMonth()}` : "undated";
            const label = date
                ? date.toLocaleDateString(undefined, { month: "long", year: "numeric" })
                : "Date to be announced";
            const group = grouped.get(key) ?? { key, label, movies: [] };
            group.movies.push(movie);
            grouped.set(key, group);
        }
        return [...grouped.values()];
    }, [movies]);

    if (loading) return <LoadingSpinner />;

    return (
        <Container className="space-y-8 py-10 text-ink">
            <header className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Release calendar</p>
                <h1 className="text-3xl font-bold capitalize sm:text-4xl">Latest releases</h1>
                <p className="text-muted">Browse upcoming and recent movies by release month.</p>
            </header>

            <div className="space-y-8">
                {groups.map((group) => (
                    <section key={group.key} className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8">
                        <h2 className="flex items-center gap-3 self-start border-b border-border pb-3 text-lg font-semibold capitalize text-ink sm:sticky sm:top-6 sm:block sm:border-b-0 sm:border-r sm:pb-0">
                            <span className="h-2 w-2 rounded-full bg-accent sm:hidden" />
                            <span className="sm:pr-6">{group.label}</span>
                        </h2>
                        <div className="grid gap-3 lg:grid-cols-2">
                            {group.movies.map((movie) => <ReleaseCard key={movie.tmdb_id} movie={movie} />)}
                        </div>
                    </section>
                ))}
            </div>

            {hasMore && (
                <div className="mt-4 flex justify-center">
                    <Button onClick={loadMore} disabled={loadingMore}>
                        {loadingMore ? "Loading..." : "Load More"}
                    </Button>
                </div>
            )}
        </Container>
    );
}
