import {useCallback, useEffect, useRef, useState} from "react";
import type {Comment} from "../../types/comment.ts";
import {getCommentsByMovie, postComment} from "../../services/commentService.ts";
import {useAsyncResource} from "../useAsyncResource.ts";

export function useMovieComments(tmdbMovieId: number) {
    const load = useCallback((signal: AbortSignal) => getCommentsByMovie(tmdbMovieId, signal), [tmdbMovieId]);
    const resource = useAsyncResource(load);
    const [submitted, setSubmitted] = useState<{tmdbMovieId: number; comments: Comment[]}>({tmdbMovieId, comments: []});
    const activeMovieId = useRef<number | null>(tmdbMovieId);

    useEffect(() => {
        activeMovieId.current = tmdbMovieId;
        return () => { activeMovieId.current = null; };
    }, [tmdbMovieId]);

    const newComments = submitted.tmdbMovieId === tmdbMovieId ? submitted.comments : [];
    const newIds = new Set(newComments.map(comment => comment.comment_id));
    const comments = [...newComments, ...(resource.data ?? []).filter(comment => !newIds.has(comment.comment_id))];

    const submit = async (text: string) => {
        const comment = await postComment(tmdbMovieId, text);
        if (activeMovieId.current !== tmdbMovieId) return;
        setSubmitted(current => ({tmdbMovieId, comments: [comment, ...(current.tmdbMovieId === tmdbMovieId ? current.comments : [])]}));
    };

    return {comments, loading: resource.loading, error: resource.error, retry: resource.retry, submit};
}
