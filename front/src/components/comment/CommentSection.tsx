import CommentForm from "./CommentForm.tsx";
import CommentCarousel from "./CommentCarousel.tsx";
import { Comment } from "../../types/comment.ts";
import {useAuth} from "../../hooks/auth/useAuth.ts";
import Title from "../ui/Title.tsx";

interface CommentSectionProps {
    comments: Comment[];
    onSubmit: (text: string) => Promise<void>;
}

export default function CommentSection({ comments, onSubmit }: CommentSectionProps) {
    const { token } = useAuth();

    return (
        <div className="bg-neutral-800 p-4 rounded-lg space-y-4">
            <Title title="Comments" size="sm" />
            <div className="flex flex-col md:flex-row gap-4">
                {token && (
                    <div className="md:w-1/3">
                        <CommentForm onSubmit={onSubmit} />
                    </div>
                )}
                <div className={`${token ? "md:w-2/3" : "w-full"}`}>
                    <CommentCarousel comments={comments} />
                </div>
            </div>
        </div>
    )
}