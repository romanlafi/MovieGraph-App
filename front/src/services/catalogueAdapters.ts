import type {Movie} from "../types/movie.ts";
import type {Person} from "../types/person.ts";
import type {Collection} from "../types/collection.ts";

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
    genres?: {tmdb_id: number; name: string}[];
    collection?: CatalogueCollection | null;
    cast?: CataloguePerson[];
    director?: string | null;
    trailer_youtube_key?: string | null;
}

export const toMovie = (movie: CatalogueMovie): Movie => ({
    id: String(movie.tmdb_id),
    tmdb_id: movie.tmdb_id,
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
    trailer_url: movie.trailer_youtube_key ?? undefined,
    cast: movie.cast?.map(toPerson),
});

export const toPerson = (person: CataloguePerson): Person => ({
    id: String(person.tmdb_id),
    tmdb_id: String(person.tmdb_id),
    name: person.name,
    photo_url: person.profile_path ?? "",
    role: person.role ?? undefined,
    character: person.character ?? undefined,
    biography: person.biography ?? undefined,
    birthday: person.birthday ?? undefined,
    place_of_birth: person.place_of_birth ?? undefined,
});

export const toCollection = (collection: CatalogueCollection): Collection => ({
    id: String(collection.tmdb_id),
    tmdb_id: String(collection.tmdb_id),
    name: collection.name,
    poster_url: collection.poster_path ?? undefined,
    backdrop_url: collection.backdrop_path ?? undefined,
    movies: collection.movies?.map(toMovie),
});
