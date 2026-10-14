import type {Movie} from "./movie.ts";

export interface Person {
    tmdbId: number;
    name: string;
    role?: string;
    photo_url: string;
    character?: string;
    biography?: string;
    birthday?: string;
    place_of_birth?: string;
}

export interface PersonFilmography {
    acted: Movie[];
    directed: Movie[];
}
