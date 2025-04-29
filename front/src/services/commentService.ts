import axios from "axios";
import { Comment } from "../types/comment";
import {API_ENDPOINTS} from "../data/apiConstants.ts";

const API_COMMENTS = API_ENDPOINTS.COMMENTS;

export async function getCommentsByMovie(movieId: string): Promise<Comment[]> {
    const res = await axios.get<Comment[]>(API_COMMENTS, {
        params: { tmdb_id: movieId },
    });
    return res.data;
}

export async function postComment(movieId: string, text: string) {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("No authorization token");
    }

    await axios.post(
        API_COMMENTS,
        { tmdb_id: movieId, text },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        }
    );
}