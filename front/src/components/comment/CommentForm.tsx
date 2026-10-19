import { useState } from "react";
import * as React from "react";
import Button from "@/components/ui/Button.tsx";

const MAX_COMMENT_LENGTH = 2000;

interface CommentFormProps {
    onSubmit: (text: string) => Promise<void>;
}

export default function CommentForm({ onSubmit }: Readonly<CommentFormProps>) {
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const comment = text.trim();
        if (!comment || submitting) return;

        setSubmitting(true);
        setError("");
        try {
            await onSubmit(comment);
            setText("");
        } catch {
            setError("Your comment could not be posted. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
                <label htmlFor="movie-comment" className="font-semibold text-ink">Add a comment</label>
                <span id="comment-character-count" className="text-xs text-muted">
                    {text.length}/{MAX_COMMENT_LENGTH}
                </span>
            </div>
            <textarea
                id="movie-comment"
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={MAX_COMMENT_LENGTH}
                rows={4}
                aria-describedby="comment-character-count"
                placeholder="What did you think of this movie?"
                className="w-full resize-y rounded-lg border border-border bg-panel p-3 text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : <span />}
                <Button type="submit" disabled={!text.trim() || submitting} className="sm:min-w-36">
                    {submitting ? "Posting..." : "Post comment"}
                </Button>
            </div>
        </form>
    );
}
