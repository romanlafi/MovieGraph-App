import {useNavigate} from "react-router-dom";
import {Movie} from "../../types/movie.ts";
import {getTmdbImageUrl} from "../../utils/tmdbImageHelper.ts";
import {FaMedal} from "react-icons/fa";
import RatingDisplay from "../common/RatingDisplay.tsx";
import Title from "../ui/Title.tsx";
import Text from "../ui/Text.tsx";

interface Props {
    movie: Movie;
    ranking?: number;
    position?: number;
}

export default function MovieHorizontalCard({ movie, ranking, position }: Props) {
    const navigate = useNavigate();

    const getMedalColor = () => {
        if (ranking === 1) return "text-yellow-400";
        if (ranking === 2) return "text-gray-300";
        if (ranking === 3) return "text-amber-700";
        return "";
    };

    return (
        <div
            className="flex items-center gap-4 p-4 bg-neutral-800 rounded-xl shadow hover:bg-neutral-700 transition cursor-pointer"
            onClick={() => navigate(`/movie/${movie.tmdb_id}`)}
        >
            {typeof position === "number" && (
                <div className="w-6 text-right text-white/50 font-semibold text-lg">{position}.</div>
            )}
            <div className="relative w-24 h-36 shrink-0 overflow-hidden rounded">
                <img
                    src={getTmdbImageUrl(movie.poster_url, "w342")}
                    alt={movie.title}
                    className="w-full h-full object-cover rounded"
                />
                {ranking && ranking <= 3 && (
                    <div className="absolute -top-0 -left-1 text-3xl">
                        <FaMedal className={getMedalColor()} />
                    </div>
                )}
            </div>

            <div className="flex flex-col justify-between h-full space-y-1 text-white overflow-hidden">
                <Title title={movie.title} size="sm" as="h3"/>
                <Text text={movie.tagline} size="sm" color="white/60" italic={true} truncate={true}/>
                <Text text={movie.year} size="sm" color="white/60"/>
                {movie.rating && (
                    <RatingDisplay rating={movie.rating} iconSize={14} />
                )}
            </div>
        </div>
    );
}