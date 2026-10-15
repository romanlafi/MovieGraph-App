import { FaRegCommentDots } from "react-icons/fa";
import type { Comment } from "@/types/comment.ts";
import CommentCard from "./CommentCard.tsx";

interface CommentListProps {
    comments: Comment[];
}

export default function CommentList({ comments }: CommentListProps) {
    if (comments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center">
                <FaRegCommentDots aria-hidden="true" className="text-2xl text-accent" />
                <p className="font-medium text-ink">No comments yet</p>
                <p className="text-sm text-muted">Be the first to share your thoughts on this movie.</p>
            </div>
        );
    }

    return (
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {comments.map((comment) => (
                <CommentCard key={comment.comment_id} comment={comment} />
            ))}
        </div>
    );
}
