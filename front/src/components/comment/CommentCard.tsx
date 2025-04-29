import { Comment } from "../../types/comment.ts";
import { format } from "date-fns";

export default function CommentCard({ comment }: { comment: Comment }) {
    return (
        <div className="w-[250px] shrink-0 bg-neutral-700 p-4 rounded-lg shadow hover:scale-98 transition-transform duration-200">
            <p className="text-sm text-white mb-2 font-semibold truncate">
                {comment.username}
            </p>

            <div className="text-xs text-white/70 mb-2 max-h-24 overflow-y-auto overflow-x-hidden">
                {comment.text}
            </div>

            <p className="text-[10px] text-white/50">
                {format(new Date(comment.created_at), "dd/MM/yyyy")}
            </p>
        </div>
    );
}