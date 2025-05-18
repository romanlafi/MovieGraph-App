import {Movie} from "./movie.ts";

export interface Collection {
    id: string;
    tmdb_id: string;
    name: string;
    poster_url?: string;
    backdrop_url?: string;
    movies?: Movie[];
}