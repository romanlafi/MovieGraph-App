import {useState} from "react";
import {FaHeart, FaRegHeart, FaSpinner} from "react-icons/fa";
import {useLikes} from "@/hooks/movie/useLikes.ts";
import {useAuth} from "@/hooks/auth/useAuth.ts";
import {clsx} from "clsx";

interface LikeButtonProps {
    tmdbMovieId: number;
    movieTitle?: string;
    className?: string;
}

export default function LikeButton({ tmdbMovieId, movieTitle = "movie", className }: LikeButtonProps) {
    const { isLiked, toggleLike } = useLikes();
    const { token } = useAuth();
    const [isPending, setIsPending] = useState(false);

    if (!token) return null;

    const liked = isLiked(tmdbMovieId);

    const handleToggleLike = async () => {
        if (isPending) return;
        setIsPending(true);
        try {
            await toggleLike(tmdbMovieId);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                void handleToggleLike();
            }}
            aria-label={`${liked ? "Unlike" : "Like"} ${movieTitle}`}
            aria-pressed={liked}
            aria-busy={isPending}
            disabled={isPending}
            className={clsx("hover:text-red-400 transition-colors disabled:cursor-wait", className)}
        >
            {isPending ? <FaSpinner className="animate-spin" aria-hidden="true" /> : liked ? <FaHeart /> : <FaRegHeart />}
        </button>
    );
}
