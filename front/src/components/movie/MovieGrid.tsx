import {Movie} from "../../types/movie.ts";
import MovieCard from "./MovieCard.tsx";

interface MovieGridProps {
    title?: string;
    movies: Movie[];
}

export default function MovieGrid({ title, movies }: MovieGridProps) {
    return (
        <section className="bg-neutral-700 rounded-xl p-6 shadow space-y-6">
            {title && <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-center">
                {movies.map((movie) => (
                    <MovieCard key={movie.tmdb_id} movie={movie} />
                ))}
            </div>
        </section>
    );
}