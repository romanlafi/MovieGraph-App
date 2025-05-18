import {Movie} from "../types/movie.ts";

export function getAverageRating(movies: Movie[]): number | null {
    const ratedMovies = movies.filter(
        (movie): movie is Movie & { rating: number } => typeof movie.rating === "number"
    );

    if (ratedMovies.length === 0) return null;

    const total = ratedMovies.reduce((acc, movie) => acc + movie.rating, 0);
    return total / ratedMovies.length;
}
