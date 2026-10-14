import type {Movie} from "./movie.ts";

export interface Genre {
    tmdbId: number;
    name: string;
}

export interface GenreMovies {
    movies: Movie[];
    partialError: boolean;
}
