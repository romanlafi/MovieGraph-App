import type {Movie, MovieSearchResult} from "../types/movie.ts";
import type {Person} from "../types/person.ts";
import type {Collection} from "../types/collection.ts";
import type {Genre} from "../types/genre.ts";
import type {CatalogueCollection, CatalogueGenre, CatalogueMovie, CataloguePerson, TmdbMovieSearchResult} from "../types/tmdb.ts";

export const hasMoviePosterAndRating = (movie: {
    poster_path: string | null;
    vote_average: number | null;
}): boolean => Boolean(movie.poster_path?.trim()) && (movie.vote_average ?? 0) > 0;

export const toMovies = (movies: CatalogueMovie[]): Movie[] =>
    movies.filter(hasMoviePosterAndRating).map(toMovie);

export const toMovie = (movie: CatalogueMovie): Movie => ({
    tmdbId: movie.tmdb_id,
    title: movie.title,
    poster_url: movie.poster_path ?? "",
    backdrop_url: movie.backdrop_path ?? undefined,
    year: movie.release_date?.slice(0, 4),
    released: movie.release_date ?? undefined,
    rating: movie.vote_average ?? undefined,
    plot: movie.overview ?? undefined,
    runtime: movie.runtime != null ? `${movie.runtime} min` : undefined,
    tagline: movie.tagline ?? undefined,
    box_office: movie.revenue ?? undefined,
    website: movie.homepage ?? undefined,
    origin_country: movie.origin_country?.join(", "),
    genres: movie.genres?.map(genre => genre.name),
    collection: movie.collection ? toCollection(movie.collection) : undefined,
    director: movie.director ?? undefined,
    production_companies: movie.production_summary ?? undefined,
    trailer_url: movie.trailer_youtube_key ?? undefined,
    cast: movie.cast?.map(toPerson),
});

export const toPerson = (person: CataloguePerson): Person => ({
    tmdbId: person.tmdb_id,
    name: person.name,
    photo_url: person.profile_path ?? "",
    role: person.role ?? undefined,
    character: person.character ?? undefined,
    biography: person.biography ?? undefined,
    birthday: person.birthday ?? undefined,
    place_of_birth: person.place_of_birth ?? undefined,
});

export const toCollection = (collection: CatalogueCollection): Collection => ({
    tmdbId: collection.tmdb_id,
    name: collection.name,
    poster_url: collection.poster_path ?? undefined,
    backdrop_url: collection.backdrop_path ?? undefined,
    movies: collection.movies ? toMovies(collection.movies) : undefined,
});

export const toGenre = (genre: CatalogueGenre): Genre => ({
    tmdbId: genre.tmdb_id,
    name: genre.name,
});

export const toMovieSearchResult = (movie: TmdbMovieSearchResult): MovieSearchResult => ({
    tmdbId: movie.tmdb_id,
    title: movie.title,
    rating: movie.rating,
    year: movie.year,
    poster_url: movie.poster_url,
});
