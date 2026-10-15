import type {Movie} from "@/types/movie.ts";
import type {GenreMovies} from "@/types/genre.ts";
import {getMoviesByTmdbGenreId} from "./moviesService.ts";

const shuffleMovies = (movies: Movie[]): Movie[] => {
    const shuffled = [...movies];
    for (let index = shuffled.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled;
};

export async function getRandomMoviesForGenre(tmdbGenreId: number, signal: AbortSignal): Promise<GenreMovies> {
    const movies: Movie[] = [];
    const pageSize = 20;
    const maxPages = 3;
    for (let page = 1; page <= maxPages && movies.length < 10; page++) {
        try {
            movies.push(...await getMoviesByTmdbGenreId(tmdbGenreId, page, pageSize, signal));
        } catch (error) {
            if (signal.aborted || movies.length === 0) throw error;
            return {movies: shuffleMovies(movies), partialError: true};
        }
    }
    return {movies: shuffleMovies(movies), partialError: false};
}
