import { useNavigate } from "react-router-dom";
import type { Movie } from "../../types/movie.ts";
import { getMovieReleaseDate } from "../../utils/releaseCalendar.ts";
import { getTmdbImageUrl } from "../../utils/tmdbImageHelper.ts";

interface MovieReleaseCardProps {
    movie: Movie;
}

export default function MovieReleaseCard({ movie }: MovieReleaseCardProps) {
    const navigate = useNavigate();
    const releaseDate = getMovieReleaseDate(movie);

    return (
        <button
            type="button"
            onClick={() => navigate(`/movie/${movie.tmdb_id}`)}
            className="group grid w-full min-w-0 grid-cols-[3rem_5rem_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-xl bg-card p-3 text-left ring-1 ring-border transition hover:bg-border sm:grid-cols-[4rem_6rem_minmax(0,1fr)_auto] sm:gap-5 sm:p-5"
        >
            <div className="flex h-20 w-12 flex-col items-center justify-center rounded-lg bg-canvas ring-1 ring-border sm:h-24 sm:w-16">
                <span className="text-xl font-bold leading-none text-accent sm:text-2xl">
                    {releaseDate ? releaseDate.getDate() : "—"}
                </span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {releaseDate ? releaseDate.toLocaleDateString("en-US", { weekday: "short" }) : "TBA"}
                </span>
            </div>
            <img
                src={getTmdbImageUrl(movie.poster_url, "w185")}
                alt={movie.title}
                loading="lazy"
                decoding="async"
                className="h-28 w-auto max-w-full rounded-md object-contain sm:h-32"
            />
            <span className="min-w-0">
                <span className="line-clamp-2 font-semibold text-ink group-hover:text-accent">{movie.title}</span>
                {movie.director && (
                    <span className="mt-1 block truncate text-sm text-muted">{movie.director}</span>
                )}
                {movie.production_companies && (
                    <span className="block truncate text-xs text-muted/80">{movie.production_companies}</span>
                )}
            </span>
            {movie.rating !== undefined && movie.rating > 0 && (
                <span className="hidden rounded-md bg-canvas px-2 py-1 text-sm font-semibold text-accent sm:block">
                    ★ {movie.rating.toFixed(1)}
                </span>
            )}
        </button>
    );
}
