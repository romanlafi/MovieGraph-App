import type {Person} from "../types/person.ts";
import {getTmdbCatalogue} from "./tmdbService.ts";
import {CatalogueMovie, CataloguePerson, toMovie, toPerson} from "./catalogueAdapters.ts";

export const getPeopleForMovie = async (tmdbMovieId: number): Promise<Person[]> => {
    const movie = await getTmdbCatalogue<{cast: CataloguePerson[]}>(`movie/${tmdbMovieId}`);
    return movie.cast.map(toPerson);
};

export const getPersonByTmdbId = async (tmdbPersonId: string): Promise<Person> => {
    return toPerson(await getTmdbCatalogue<CataloguePerson>(`person/${tmdbPersonId}`));
};

export const getPersonFilmography = async (tmdbPersonId: string) => {
    const filmography = await getTmdbCatalogue<{acted: CatalogueMovie[]; directed: CatalogueMovie[]}>(
        `person/${tmdbPersonId}/filmography`,
    );
    return {acted: filmography.acted.map(toMovie), directed: filmography.directed.map(toMovie)};
};

export const getRelatedPeople = async (tmdbPersonId: string): Promise<Person[]> => {
    return (await getTmdbCatalogue<CataloguePerson[]>(`person/${tmdbPersonId}/related`)).map(toPerson);
};

export const getRandomPeople = async (): Promise<Person[]> => {
    return (await getTmdbCatalogue<CataloguePerson[]>("people/featured")).map(toPerson);
};
