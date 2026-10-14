import {api} from "./api.ts";
import { Comment } from "../types/comment";

export const getCommentsByMovie = async (tmdbMovieId: number): Promise<Comment[]> => {
    const res = await api.get(`/movies/${tmdbMovieId}/comments`);
    return res.data;
}

export const postComment = async (tmdbMovieId: number, text: string): Promise<Comment> => {
    const res = await api.post<Comment>(`/movies/${tmdbMovieId}/comments`, { text });
    return res.data;
}
