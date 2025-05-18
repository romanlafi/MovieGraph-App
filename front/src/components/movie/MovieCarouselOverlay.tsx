import MovieCard from "./MovieCard.tsx";
import {Movie} from "../../types/movie.ts";

interface Props {
    movies: Movie[];
}

export default function MovieCarouselOverlay({ movies }: Props) {
    if (!movies.length) return null;

    return (
        <div className="overflow-x-auto">
            <div className="flex gap-4 pb-4 scroll-smooth snap-x snap-mandatory whitespace-nowrap">
                {movies.map((movie) => (
                    <div key={movie.tmdb_id} className="snap-start shrink-0">
                        <MovieCard movie={movie} />
                    </div>
                ))}
            </div>
        </div>
    );
}