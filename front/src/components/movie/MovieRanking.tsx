import type {Movie} from "../../types/movie.ts";
import MovieHorizontalCard from "./MovieHorizontalCard.tsx";
import TopRatedMovieCard from "./TopRatedMovieCard.tsx";

export default function MovieRanking({movies}: {movies: Movie[]}) {
    if (movies.length < 3) return null;

    return (
        <>
            <section aria-labelledby="top-three-heading" className="space-y-4">
                <div className="flex items-center gap-3">
                    <h2 id="top-three-heading" className="text-xl font-bold">Top 3</h2>
                    <span className="h-px flex-1 bg-border" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {([1, 2, 3] as const).map(rank => (
                        <TopRatedMovieCard key={movies[rank - 1].tmdbId} movie={movies[rank - 1]} rank={rank} />
                    ))}
                </div>
            </section>
            {movies.length > 3 && (
                <section aria-labelledby="more-ranked-heading" className="space-y-4">
                    <div className="flex items-center gap-3">
                        <h2 id="more-ranked-heading" className="text-xl font-bold">More top-rated movies</h2>
                        <span className="h-px flex-1 bg-border" />
                    </div>
                    <div className="space-y-4">
                        {movies.slice(3).map((movie, index) => (
                            <MovieHorizontalCard key={movie.tmdbId} movie={movie} position={index + 4} />
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}
