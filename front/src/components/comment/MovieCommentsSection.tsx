import {useMovieComments} from "@/hooks/movie/useMovieComments.ts";
import CommentSection from "./CommentSection.tsx";

export default function MovieCommentsSection({tmdbMovieId}: Readonly<{tmdbMovieId: number}>) {
    const {comments, loading, error, retry, submit} = useMovieComments(tmdbMovieId);

    return <CommentSection comments={comments} loading={loading}
        error={error ? "Couldn't load comments. Please try again." : null} onRetry={retry} onSubmit={submit} />;
}
