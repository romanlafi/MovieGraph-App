import { useState } from "react";
import type { Comment } from "@/types/comment.ts";
import { format } from "date-fns";

const COLLAPSED_COMMENT_LENGTH = 240;

export default function CommentCard({ comment }: Readonly<{ comment: Comment }>) {
    const [expanded, setExpanded] = useState(false);
    const canExpand = comment.text.length > COLLAPSED_COMMENT_LENGTH;
    const createdAt = new Date(comment.created_at);

    return (
        <article className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
                <p className="truncate font-semibold text-ink">{comment.username}</p>
                <time dateTime={comment.created_at} className="shrink-0 text-xs text-muted">
                    {format(createdAt, "MMM d, yyyy")}
                </time>
            </div>
            <p className={`min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/80 ${canExpand && !expanded ? "line-clamp-7" : ""}`}>
                {comment.text}
            </p>
            {canExpand && (
                <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpanded((current) => !current)}
                    className="mt-3 text-sm font-semibold text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                    {expanded ? "Show less" : "Read more"}
                </button>
            )}
        </article>
    );
}
