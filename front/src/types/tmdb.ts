/** Catalogue identity only; this result has no MovieGraph database ID. */
export interface TmdbMovieSearchResult {
    tmdb_id: number;
    title: string;
    rating: number | null;
    year: number | null;
    poster_url: string | null;
}
