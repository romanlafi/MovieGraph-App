import {api} from "./api.ts";
import {API_PEOPLE} from "../data/apiConstants.ts";
import { Person } from "../types/person";

export const getPeopleForMovie = async (movieId: string): Promise<Person[]> => {
    const res = await api.get(`${API_PEOPLE}/movie/`, { params: { movie_id: movieId } });
    return res.data;
}