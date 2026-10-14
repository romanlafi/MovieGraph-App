import type {Movie} from "./movie.ts";

export interface Collection {
    tmdbId: number;
    name: string;
    poster_url?: string;
    backdrop_url?: string;
    movies?: Movie[];
}
