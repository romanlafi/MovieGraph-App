import type {Movie} from "../types/movie.ts";
import type {Genre} from "../types/genre.ts";
import type {Collection} from "../types/collection.ts";
import {getTmdbCatalogue} from "./tmdbService.ts";
import {CatalogueCollection, CatalogueMovie, toCollection, toMovie} from "./catalogueAdapters.ts";

export const getMoviesByGenre = async (genreName: string, page = 1, limit = 10): Promise<Movie[]> => {
    const genres = await getGenres();
    const genre = genres.find(candidate => candidate.name.toLowerCase() === genreName.toLowerCase());
    return genre ? getMoviesByTmdbGenreId(Number(genre.id), page, limit) : [];
};

export const getMoviesByTmdbGenreId = async (tmdbGenreId: number, page = 1, limit = 10): Promise<Movie[]> => {
    const movies = await getTmdbCatalogue<CatalogueMovie[]>("movies", {
        kind: "genre", tmdb_genre_id: tmdbGenreId, page, limit,
    });
    return movies.map(toMovie);
};

export const getMoviesByCollection = async (tmdbCollectionId: string, page = 1, limit = 10): Promise<Movie[]> => {
    const collection = await getTmdbCatalogue<CatalogueCollection>(`collection/${tmdbCollectionId}`);
    return (collection.movies ?? []).slice((page - 1) * limit, page * limit).map(toMovie);
};

const getMovieList = async (kind: string, page: number, limit: number): Promise<Movie[]> => {
    return (await getTmdbCatalogue<CatalogueMovie[]>("movies", {kind, page, limit})).map(toMovie);
};

export const getTopRatedMovies = (page = 1, limit = 10): Promise<Movie[]> => getMovieList("top-rated", page, limit);
export const getLatestMovies = (page = 1, limit = 10): Promise<Movie[]> => getMovieList("latest", page, limit);

export const getRelatedMovies = async (tmdbMovieId: number): Promise<Movie[]> => {
    return (await getTmdbCatalogue<CatalogueMovie[]>(`movie/${tmdbMovieId}/recommendations`)).map(toMovie);
};

export const getMovieByTmdbId = async (tmdbMovieId: string): Promise<Movie> => {
    return toMovie(await getTmdbCatalogue<CatalogueMovie>(`movie/${tmdbMovieId}`));
};

export const getGenres = async (): Promise<Genre[]> => {
    const genres = await getTmdbCatalogue<{tmdb_id: number; name: string}[]>("genres");
    return genres.map(genre => ({id: String(genre.tmdb_id), name: genre.name}));
};

export const getCollections = async (): Promise<Collection[]> => {
    return (await getTmdbCatalogue<CatalogueCollection[]>("collections")).map(toCollection);
};

export const getRandomMovies = async (limit = 5): Promise<Movie[]> => {
    return (await getTmdbCatalogue<CatalogueMovie[]>("movies/featured", {limit})).map(toMovie);
};

export const getRandomCollection = async (): Promise<Collection> => {
    const collections = await getTmdbCatalogue<CatalogueCollection[]>("collections", {random_one: true});
    return toCollection(collections[0]);
};
