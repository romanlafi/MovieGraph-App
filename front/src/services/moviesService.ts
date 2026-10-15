import type {Movie} from "@/types/movie.ts";
import type {Genre} from "@/types/genre.ts";
import type {Collection} from "@/types/collection.ts";
import {getTmdbCatalogue} from "./tmdbService.ts";
import type {CatalogueCollection, CatalogueGenre, CatalogueMovie} from "@/types/tmdb.ts";
import {toCollection, toGenre, toMovie, toMovies} from "./catalogueAdapters.ts";

export const getMoviesByGenre = async (genreName: string, page = 1, limit = 10, signal?: AbortSignal): Promise<Movie[]> => {
    const genres = await getGenres(signal);
    const genre = genres.find(candidate => candidate.name.toLowerCase() === genreName.toLowerCase());
    return genre ? getMoviesByTmdbGenreId(genre.tmdbId, page, limit, signal) : [];
};

export const getMoviesByTmdbGenreId = async (tmdbGenreId: number, page = 1, limit = 10, signal?: AbortSignal): Promise<Movie[]> => {
    const movies = await getTmdbCatalogue<CatalogueMovie[]>("movies", {
        kind: "genre", tmdb_genre_id: tmdbGenreId, page, limit,
    }, signal);
    return toMovies(movies);
};

export const getMoviesByCollection = async (tmdbCollectionId: number, page = 1, limit = 10, signal?: AbortSignal): Promise<Movie[]> => {
    const collection = await getTmdbCatalogue<CatalogueCollection>(`collection/${tmdbCollectionId}`, undefined, signal);
    return toMovies(collection.movies ?? []).slice((page - 1) * limit, page * limit);
};

const getMovieList = async (kind: string, page: number, limit: number, signal?: AbortSignal): Promise<Movie[]> => {
    return toMovies(await getTmdbCatalogue<CatalogueMovie[]>("movies", {kind, page, limit}, signal));
};

export const getTopRatedMovies = (page = 1, limit = 10, signal?: AbortSignal): Promise<Movie[]> => getMovieList("top-rated", page, limit, signal);
export const getLatestMovies = (page = 1, limit = 10, signal?: AbortSignal): Promise<Movie[]> => getMovieList("latest", page, limit, signal);

export const getRelatedMovies = async (tmdbMovieId: number, signal?: AbortSignal): Promise<Movie[]> => {
    return toMovies(await getTmdbCatalogue<CatalogueMovie[]>(`movie/${tmdbMovieId}/recommendations`, undefined, signal));
};

export const getMovieByTmdbId = async (tmdbMovieId: number, signal?: AbortSignal): Promise<Movie> => {
    return toMovie(await getTmdbCatalogue<CatalogueMovie>(`movie/${tmdbMovieId}`, undefined, signal));
};

export const getGenres = async (signal?: AbortSignal): Promise<Genre[]> => {
    return (await getTmdbCatalogue<CatalogueGenre[]>("genres", undefined, signal)).map(toGenre);
};

export const getCollections = async (signal?: AbortSignal): Promise<Collection[]> => {
    return (await getTmdbCatalogue<CatalogueCollection[]>("collections", undefined, signal)).map(toCollection);
};

export const getRandomMovies = async (limit = 5, signal?: AbortSignal): Promise<Movie[]> => {
    return toMovies(await getTmdbCatalogue<CatalogueMovie[]>("movies/featured", {limit}, signal));
};

export const getRandomCollection = async (signal?: AbortSignal): Promise<Collection | null> => {
    const collections = await getTmdbCatalogue<CatalogueCollection[]>("collections", {random_one: true}, signal);
    return collections.length ? toCollection(collections[0]) : null;
};
