import { useNavigate } from "react-router-dom";
import { FaMedal } from "react-icons/fa";
import type { Movie } from "@/types/movie.ts";
import { getTmdbImageUrl } from "@/utils/tmdbImageHelper.ts";
import RatingDisplay from "@/components/ui/RatingDisplay.tsx";

interface TopRatedMovieCardProps {
    movie: Movie;
    rank: 1 | 2 | 3;
}

const rankStyles = {
    1: {
        card: "border-accent/50 bg-gradient-to-br from-accent/10 to-card",
        medal: "text-accent",
    },
    2: {
        card: "border-muted/40 bg-card",
        medal: "text-muted",
    },
    3: {
        card: "border-amber-700/40 bg-card",
        medal: "text-amber-700",
    },
};

export default function TopRatedMovieCard({ movie, rank }: TopRatedMovieCardProps) {
    const navigate = useNavigate();
    const styles = rankStyles[rank];

    return (
        <button
            type="button"
            onClick={() => navigate(`/movie/${movie.tmdbId}`)}
            aria-label={`${movie.title}, ranked number ${rank}, rated ${movie.rating?.toFixed(1)}`}
            className={`group grid w-full grid-cols-[6rem_minmax(0,1fr)] items-center gap-4 rounded-2xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-border sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-5 sm:p-4 ${styles.card}`}
        >
            <div className="relative h-36 w-24 sm:h-40 sm:w-28">
                <img
                    src={getTmdbImageUrl(movie.poster_url, "w342")}
                    alt={movie.title}
                    loading={rank === 1 ? "eager" : "lazy"}
                    decoding="async"
                    className="h-full w-full rounded-lg object-cover shadow-md"
                />
                <span className="absolute -left-2 -top-2 flex items-center gap-1 rounded-full bg-canvas px-2 py-1 text-xs font-bold text-ink ring-1 ring-border">
                    <FaMedal aria-hidden="true" className={styles.medal} />
                    #{rank}
                </span>
            </div>
            <span className="flex min-w-0 flex-col items-start gap-3">
                <span className="line-clamp-3 text-lg font-bold leading-snug text-ink group-hover:text-accent">
                    {movie.title}
                </span>
                {movie.year && <span className="text-sm text-muted">{movie.year}</span>}
                {movie.rating !== undefined && (
                    <RatingDisplay rating={movie.rating} iconSize={15} className="rounded-lg bg-canvas px-3 py-2" />
                )}
            </span>
        </button>
    );
}
