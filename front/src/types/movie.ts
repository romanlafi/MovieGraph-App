import type {Collection} from "./collection.ts";
import type {Person} from "./person.ts";

export interface Movie {
    tmdbId: number;
    title: string;
    poster_url: string;
    year?: string;
    genres?: string[];
    rating?: number;
    released?: string;
    runtime?: string;
    director?: string;
    production_companies?: string;
    box_office?: number;
    website?: string;
    plot?: string;
    trailer_url?: string;
    backdrop_url?: string;
    tagline?: string;
    origin_country?: string;
    collection?: Collection;
    cast?: Person[];
}

export interface MovieSearchResult {
    tmdbId: number;
    title: string;
    rating: number | null;
    year: number | null;
    poster_url: string | null;
}
