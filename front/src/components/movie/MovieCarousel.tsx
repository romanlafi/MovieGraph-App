import MovieCard from "./MovieCard.tsx";
import {Movie} from "../../types/movie.ts";
import {useNavigate} from "react-router-dom";

interface Props {
    movies: Movie[];
    title?: string;
    subtitle?: string;
    genreLink?: boolean;
}

export default function MovieCarousel({ movies, title, subtitle, genreLink = true }: Props) {
    const navigate = useNavigate();

    const handleTitleClick = () => {
        if (genreLink && title) {
            navigate(`/genre/${encodeURIComponent(title)}`);
        }
    };

    if (!movies.length) return null;

    return (
        <section className="bg-neutral-800 rounded-xl p-6 shadow space-y-4">
            {title && (
                <h2
                    className={`text-2xl font-bold mb-2 ${genreLink ? "cursor-pointer hover:text-purple-400" : ""}`}
                    onClick={handleTitleClick}
                >
                    {title}
                </h2>
            )}
            {subtitle && (
                <p className="text-sm text-white/70">{subtitle}</p>
            )}
            <div className="overflow-x-auto">
                <div className="flex gap-4 pb-4 scroll-smooth snap-x snap-mandatory whitespace-nowrap">
                    {movies.map((movie) => (
                        <div key={movie.tmdb_id} className="snap-start shrink-0">
                            <MovieCard movie={movie} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
