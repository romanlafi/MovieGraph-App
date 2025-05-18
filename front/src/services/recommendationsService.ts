import {api} from "./api.ts";
import {API_RECOMMENDATIONS} from "../data/apiConstants.ts";
import {Movie} from "../types/movie.ts";
import {Person} from "../types/person.ts";

export const getHeroRecommendations = async () : Promise<Movie[]> => {
    const res = await api.get(`${API_RECOMMENDATIONS}/hero`);
    return res.data;
}

export const getRecommendationsFromLikes = async (limit: number = 10) : Promise<Movie[]> => {
    const res = await api.get(`${API_RECOMMENDATIONS}/by_likes`, {
        params: { limit }
    });
    return res.data;
}

export const getFriendsRecommendations = async () : Promise<Movie[]> => {
    const res = await api.get(`${API_RECOMMENDATIONS}/friends`);
    return res.data;
}

export const getRecommendedPeople = async () : Promise<Person[]> => {
    const res = await api.get(`${API_RECOMMENDATIONS}/people`);
    return res.data;
}

