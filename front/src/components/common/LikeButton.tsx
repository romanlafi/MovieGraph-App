import {FaHeart, FaRegHeart} from "react-icons/fa";
import {useLikes} from "../../contexts/LikeContext.tsx";
import {useAuth} from "../../hooks/auth/useAuth.ts";

interface LikeButtonProps {
    tmdbMovieId: number;
}

export default function LikeButton({ tmdbMovieId }: LikeButtonProps) {
    const { isLiked, toggleLike } = useLikes();
    const { token } = useAuth();

    if (!token) return null;

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                void toggleLike(tmdbMovieId);
            }}
            className="hover:text-red-400 transition-colors"
        >
            {isLiked(tmdbMovieId) ? <FaHeart /> : <FaRegHeart />}
        </button>
    );
}
