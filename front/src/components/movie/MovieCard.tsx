import {Movie} from "../../types/movie.ts";
import {FaHeart, FaStar} from "react-icons/fa";
import {Link} from "react-router-dom";

interface Props {
    movie: Movie;
}

export default function MovieCard({ movie }: Props) {
    return (
        <Link to={`/movie/${movie.id}`} className="block">
            <div className="w-[140px] shrink-0 bg-neutral-900 p-2 rounded hover:scale-98 hover:bg-neutral-950 transition-transform duration-200 ease-out shadow hover:shadow-xl">
                <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-full aspect-[2/3] object-cover rounded mb-2"
                />
                <p className="text-sm text-white truncate">{movie.title}</p>

                <div className="flex items-center justify-between mt-1">
                    {movie.rating && (
                        <div className="flex items-center gap-1 text-yellow-400 text-sm">
                            <FaStar className="text-xs" />
                            {movie.rating.toPrecision(3)}
                        </div>
                    )}

                    <button
                        className="text-white/60 hover:text-pink-500 transition-colors focus:outline-none"
                        title="Me gusta"
                    >
                        <FaHeart size={14} />
                    </button>
                </div>
            </div>
        </Link>
    );
}