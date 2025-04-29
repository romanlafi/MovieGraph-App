import CommentCard from "./CommentCard.tsx";
import { Comment } from "../../types/comment.ts";

export default function CommentCarousel({ comments }: { comments: Comment[] }) {
    return (
        <section className="bg-neutral-900 rounded-xl p-6 shadow space-y-4">
            <div className="overflow-x-auto">
                <div className="flex gap-4 pb-4 scroll-smooth snap-x snap-mandatory whitespace-nowrap">
                    {comments.length === 0 ? (
                        <div className="flex items-center justify-center w-full text-center text-sm text-white/50">
                            No comments yet. Be the first to comment!
                        </div>
                    ) : (
                        comments.map((comment) => (
                            <div key={comment.comment_id} className="snap-start shrink-0">
                                <CommentCard comment={comment} />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}