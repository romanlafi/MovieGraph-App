import MovieCard from "./MovieCard.tsx";
import type {Movie} from "@/types/movie.ts";
import HorizontalScroller from "@/components/layout/HorizontalScroller.tsx";

interface Props {
    movies: Movie[];
}

export default function MovieCarouselOverlay({ movies }: Readonly<Props>) {
    if (!movies.length) return null;

    return (
        <HorizontalScroller>
            {movies.map((movie) => (
                <div key={movie.tmdbId} className="snap-start shrink-0">
                    <MovieCard movie={movie} />
                </div>
            ))}
        </HorizontalScroller>
    );
}
