export interface TmdbMovieSearchResult {
    tmdb_id: number;
    title: string;
    rating: number | null;
    year: number | null;
    poster_url: string | null;
}

export interface CatalogueGenre {
    tmdb_id: number;
    name: string;
}

export interface CataloguePerson {
    tmdb_id: number;
    name: string;
    profile_path: string | null;
    role?: string | null;
    character?: string | null;
    biography?: string | null;
    birthday?: string | null;
    place_of_birth?: string | null;
}

export interface CatalogueCollection {
    tmdb_id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
    movies?: CatalogueMovie[];
}

export interface CatalogueMovie {
    tmdb_id: number;
    title: string;
    release_date: string | null;
    vote_average: number | null;
    poster_path: string | null;
    backdrop_path: string | null;
    overview?: string | null;
    runtime?: number | null;
    tagline?: string | null;
    revenue?: number | null;
    homepage?: string | null;
    origin_country?: string[];
    genres?: CatalogueGenre[];
    collection?: CatalogueCollection | null;
    cast?: CataloguePerson[];
    director?: string | null;
    production_summary?: string | null;
    trailer_youtube_key?: string | null;
}

export interface CatalogueFilmography {
    acted: CatalogueMovie[];
    directed: CatalogueMovie[];
}
