import type {Person, PersonFilmography} from "@/types/person.ts";
import type {CatalogueFilmography, CataloguePerson} from "@/types/tmdb.ts";
import {getTmdbCatalogue} from "./tmdbService.ts";
import {toMovies, toPerson} from "./catalogueAdapters.ts";

export const getPersonByTmdbId = async (tmdbPersonId: number, signal?: AbortSignal): Promise<Person> => {
    return toPerson(await getTmdbCatalogue<CataloguePerson>(`person/${tmdbPersonId}`, undefined, signal));
};

export const getPersonFilmography = async (tmdbPersonId: number, signal?: AbortSignal): Promise<PersonFilmography> => {
    const filmography = await getTmdbCatalogue<CatalogueFilmography>(
        `person/${tmdbPersonId}/filmography`, undefined, signal,
    );
    return {acted: toMovies(filmography.acted), directed: toMovies(filmography.directed)};
};

export const getRelatedPeople = async (tmdbPersonId: number, signal?: AbortSignal): Promise<Person[]> => {
    return (await getTmdbCatalogue<CataloguePerson[]>(`person/${tmdbPersonId}/related`, undefined, signal)).map(toPerson);
};

export const getRandomPeople = async (signal?: AbortSignal): Promise<Person[]> => {
    return (await getTmdbCatalogue<CataloguePerson[]>("people/featured", undefined, signal)).map(toPerson);
};
