import {api} from "./api.ts";
import {API_COMMENTS} from "../data/apiConstants.ts";
import { Comment } from "../types/comment";

export const getCommentsByMovie = async (movieId: string): Promise<Comment[]> => {
    const res = await api.get(API_COMMENTS, { params: { movie_id: movieId } });
    return res.data;
}

export const postComment = async (movieId: string, text: string) => {
    await api.post(API_COMMENTS, { movie_id: movieId, text });
}