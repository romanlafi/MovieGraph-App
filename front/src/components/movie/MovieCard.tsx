import {Movie} from "@/types/movie.ts";
import {Link} from "react-router-dom";
import RatingDisplay from "@/components/ui/RatingDisplay.tsx";
import LikeButton from "./LikeButton.tsx";
import {getTmdbImageUrl} from "@/utils/tmdbImageHelper.ts";
import Text from "@/components/ui/Text.tsx";

interface Props {
    movie: Movie;
}

export default function MovieCard({movie}: Readonly<Props>) {
    return (
        <div
            className="w-[140px] shrink-0 bg-card p-2 rounded hover:scale-98 hover:bg-border transition duration-200 ease-out shadow hover:shadow-xl">
            <Link to={`/movie/${movie.tmdbId}`} className="block rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                <img
                    src={getTmdbImageUrl(movie.poster_url)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full aspect-[2/3] object-cover rounded mb-2"
                />
                <Text text={movie.title} size="sm" truncate={true} />
            </Link>
            <div className="flex items-center justify-between mt-1">
                {movie.rating && <RatingDisplay rating={movie.rating}/>}
                <LikeButton tmdbMovieId={movie.tmdbId}/>
            </div>
        </div>

    );
}
