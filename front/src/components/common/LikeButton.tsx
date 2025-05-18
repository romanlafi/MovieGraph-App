import {FaHeart, FaRegHeart} from "react-icons/fa";
import {useLikes} from "../../contexts/LikeContext.tsx";
import {useAuth} from "../../hooks/auth/useAuth.ts";

interface LikeButtonProps {
    movieId: string;
}

export default function LikeButton({ movieId }: LikeButtonProps) {
    const { isLiked, toggleLike } = useLikes();
    const { token } = useAuth();

    if (!token) return null;

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                void toggleLike(movieId);
            }}
            className="hover:text-purple-400 transition-colors"
        >
            {isLiked(movieId) ? <FaHeart /> : <FaRegHeart />}
        </button>
    );
}