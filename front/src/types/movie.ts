export interface Movie {
    tmdb_id: string;
    title: string;
    poster_url: string;
    year?: string;
    genres?: string[];
    rating?: number;
    released?: string;
    runtime?: string;
    director?: string;
    box_office?: string;
    production?: string;
    website?: string;
    type?: string;
    plot?: string;
    rated?: string;
    trailer_url?: string;
}