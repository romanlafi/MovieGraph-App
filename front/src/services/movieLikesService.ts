import {api} from "./api.ts";

export const getUserLikes = async (signal?: AbortSignal): Promise<number[]> => {
    const response = await api.get<number[]>("/movies/likes", {signal});
    return response.data;
};

export const likeMovie = async (tmdbMovieId: number) => {
    const response = await api.post(`/movies/${tmdbMovieId}/like`);
    return response.data;
};

export const unlikeMovie = async (tmdbMovieId: number) => {
    const response = await api.delete(`/movies/${tmdbMovieId}/like`);
    return response.data;
};
