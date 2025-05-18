import {api} from "./api.ts";
import {API_PEOPLE} from "../data/apiConstants.ts";
import { Person } from "../types/person";
import {Movie} from "../types/movie.ts";

export const getPeopleForMovie = async (movieId: string): Promise<Person[]> => {
    const res = await api.get(`${API_PEOPLE}/movie/`, { params: { movie_id: movieId } });
    return res.data;
}

export const getPersonByTmdbId = async (personId: string): Promise<Person> => {
    const res = await api.get(`${API_PEOPLE}/by_tmdb/`, { params: { tmdb_id: personId } });
    return res.data;
}

export const getActedMovies = async (personId: string): Promise<Movie[]> => {
    const res = await api.get(`${API_PEOPLE}/acted/`, { params: { person_id: personId } });
    return res.data;
}

export const getDirectedMovies = async (personId: string): Promise<Movie[]> => {
    const res = await api.get(`${API_PEOPLE}/directed/`, { params: { person_id: personId } });
    return res.data;
}

export const getRelatedPeople = async (personId: string): Promise<Person[]> => {
    const res = await api.get(`${API_PEOPLE}/related/`, { params: { person_id: personId } });
    return res.data;
}

export const getRandomPeople = async (): Promise<Person[]> => {
    const res = await api.get(`${API_PEOPLE}/random/`);
    return res.data;
}