import {useNavigate} from "react-router-dom";
import {Movie} from "@/types/movie.ts";
import {getTmdbImageUrl} from "@/utils/tmdbImageHelper.ts";
import RatingDisplay from "@/components/ui/RatingDisplay.tsx";
import Title from "@/components/ui/Title.tsx";
import Text from "@/components/ui/Text.tsx";

interface Props {
    movie: Movie;
    position?: number;
}

export default function MovieHorizontalCard({ movie, position }: Props) {
    const navigate = useNavigate();

    return (
        <button
            type="button"
            className="flex w-full min-w-0 items-center gap-4 rounded-xl bg-card p-3 text-left ring-1 ring-border transition hover:bg-border sm:p-4"
            onClick={() => navigate(`/movie/${movie.tmdbId}`)}
        >
            {typeof position === "number" && (
                <span className="w-8 shrink-0 text-right text-muted font-semibold text-lg">{position}.</span>
            )}
            <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded sm:h-32 sm:w-[5.5rem]">
                <img
                    src={getTmdbImageUrl(movie.poster_url, "w342")}
                    alt={movie.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover rounded"
                />
            </div>

            <div className="min-w-0 flex-1 space-y-1 overflow-hidden text-ink">
                <Title title={movie.title} size="sm" as="h3" className="line-clamp-2"/>
                <Text text={movie.director} size="sm" color="white/60" italic={true} truncate={true}/>
                <Text text={movie.year} size="sm" color="white/60"/>
            </div>
            {movie.rating !== undefined && movie.rating > 0 && (
                <RatingDisplay rating={movie.rating} iconSize={14} className="shrink-0 rounded-lg bg-canvas px-3 py-2" />
            )}
        </button>
    );
}
