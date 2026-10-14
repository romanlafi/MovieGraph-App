import CommentForm from "./CommentForm.tsx";
import CommentList from "./CommentList.tsx";
import type { Comment } from "../../types/comment.ts";
import {useAuth} from "../../hooks/auth/useAuth.ts";
import Title from "../ui/Title.tsx";

interface CommentSectionProps {
    comments: Comment[];
    onSubmit: (text: string) => Promise<void>;
}

export default function CommentSection({ comments, onSubmit }: CommentSectionProps) {
    const { token } = useAuth();

    return (
        <section className="space-y-6 rounded-2xl border border-border bg-panel p-4 sm:p-6">
            <header className="flex items-center justify-between gap-3">
                <Title title="Comments" size="sm" />
                <span className="rounded-full bg-card px-3 py-1 text-sm text-muted">
                    {comments.length} {comments.length === 1 ? "comment" : "comments"}
                </span>
            </header>
            {token ? (
                <CommentForm onSubmit={onSubmit} />
            ) : (
                <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted">
                    Sign in from the header to join the conversation.
                </p>
            )}
            <div className="border-t border-border pt-6">
                <CommentList comments={comments} />
            </div>
        </section>
    );
}
