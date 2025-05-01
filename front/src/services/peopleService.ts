import { Person } from "../types/person";
import axios from "axios";
import {API_ENDPOINTS} from "../data/apiConstants.ts";

const API_PEOPLE = API_ENDPOINTS.PEOPLE;

export const getPeopleForMovie = async (movie_id: string): Promise<Person[]> => {
    const res = await axios.get<Person[]>(
        `${API_PEOPLE}/movie`,
        {
            params: { movie_id }
        }
    );
    return res.data;
};