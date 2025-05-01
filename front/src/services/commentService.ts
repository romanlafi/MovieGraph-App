import axios from "axios";
import { Comment } from "../types/comment";
import {API_ENDPOINTS} from "../data/apiConstants.ts";

const API_COMMENTS = API_ENDPOINTS.COMMENTS;

export async function getCommentsByMovie(movie_id: string): Promise<Comment[]> {
    const res = await axios.get<Comment[]>(API_COMMENTS, {
        params: { movie_id },
    });
    return res.data;
}

export async function postComment(movie_id: string, text: string) {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("No authorization token");
    }

    await axios.post(
        API_COMMENTS,
        { movie_id, text },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        }
    );
}