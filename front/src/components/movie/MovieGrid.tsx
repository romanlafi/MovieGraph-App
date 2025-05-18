import {Movie} from "../../types/movie.ts";
import MovieCard from "./MovieCard.tsx";
import Title from "../ui/Title.tsx";

interface MovieGridProps {
    title?: string;
    movies: Movie[];
}

export default function MovieGrid({ title, movies }: MovieGridProps) {
    return (
        <section className="flex justify-center">
            <Title title={title} as="h2" size="xl"/>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-center">
                {movies.map((movie) => (
                    <MovieCard key={movie.tmdb_id} movie={movie} />
                ))}
            </div>
        </section>
    );
}