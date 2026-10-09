import {Movie} from "../../types/movie.ts";
import {useNavigate} from "react-router-dom";
import RatingDisplay from "../common/RatingDisplay.tsx";
import LikeButton from "../common/LikeButton.tsx";
import {getTmdbImageUrl} from "../../utils/tmdbImageHelper.ts";
import Text from "../ui/Text.tsx";

interface Props {
    movie: Movie;
}

export default function MovieCard({movie}: Props) {
    const navigate = useNavigate();

    const handleCardClick = () => {
        navigate(`/movie/${movie.tmdb_id}`);
    };

    return (
        <div
            onClick={() => handleCardClick()}
            className="w-[140px] shrink-0 bg-card p-2 rounded hover:scale-98 hover:bg-border transition duration-200 ease-out shadow hover:shadow-xl">
            <img
                src={getTmdbImageUrl(movie.poster_url)}
                alt={movie.title}
                loading="lazy"
                decoding="async"
                className="w-full aspect-[2/3] object-cover rounded mb-2"
            />
            <Text text={movie.title} size="sm" truncate={true} />

            <div className="flex items-center justify-between mt-1">
                {movie.rating && <RatingDisplay rating={movie.rating}/>}
                <LikeButton tmdbMovieId={movie.tmdb_id}/>
            </div>
        </div>

    );
}
