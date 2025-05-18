import {Collection} from "./collection.ts";

export interface Movie {
    id: string;
    tmdb_id: number;
    title: string;
    poster_url: string;
    year?: string;
    genres?: string[];
    rating?: number;
    released?: string;
    runtime?: string;
    director?: string;
    box_office?: number;
    website?: string;
    plot?: string;
    trailer_url?: string;
    backdrop_url?: string;
    tagline?: string;
    origin_country?: string;
    collection?: Collection
}