import {api} from "./api.ts";
import { Comment } from "../types/comment";

export const getCommentsByMovie = async (tmdbMovieId: number, signal?: AbortSignal): Promise<Comment[]> => {
    const res = await api.get<Comment[]>(`/movies/${tmdbMovieId}/comments`, {signal});
    return res.data;
}

export const postComment = async (tmdbMovieId: number, text: string): Promise<Comment> => {
    const res = await api.post<Comment>(`/movies/${tmdbMovieId}/comments`, { text });
    return res.data;
}
