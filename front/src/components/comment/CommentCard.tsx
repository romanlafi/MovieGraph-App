import { Comment } from "../../types/comment.ts";
import { format } from "date-fns";
import Text from "../ui/Text.tsx";

export default function CommentCard({ comment }: { comment: Comment }) {
    return (
        <div className="w-[250px] shrink-0 bg-neutral-700 p-4 rounded-lg shadow hover:scale-98 transition-transform duration-200">
            <Text
                text={comment.username}
                size="sm"
                className="mb-2 font-semibold"
                truncate={true}
            />
            <Text
                text={comment.text}
                size="xs"
                color="white/70"
                className="mb-2 max-h-24 overflow-y-auto overflow-x-hidden"
            />
            <Text
                text={format(new Date(comment.created_at), "dd/MM/yyyy")}
                className="text-[10px]"
                color="white/50"
            />
        </div>
    );
}