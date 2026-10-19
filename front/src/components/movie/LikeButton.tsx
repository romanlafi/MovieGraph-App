import {useState} from "react";
import {FaHeart, FaRegHeart, FaSpinner} from "react-icons/fa";
import {useLikes} from "@/hooks/movie/useLikes.ts";
import {useAuth} from "@/hooks/auth/useAuth.ts";
import {clsx} from "clsx";
import type {ReactNode} from "react";

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
    let icon: ReactNode = <FaRegHeart />;
    let label = "Like";
    if (liked) {
        icon = <FaHeart />;
        label = "Unlike";
    }
    if (isPending) {
        icon = <FaSpinner className="animate-spin" aria-hidden="true" />;
    }

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
            onClick={() => void handleToggleLike()}
            aria-label={`${label} ${movieTitle}`}
            aria-pressed={liked}
            aria-busy={isPending}
            disabled={isPending}
            className={clsx("hover:text-red-400 transition-colors disabled:cursor-wait", className)}
        >
            {icon}
        </button>
    );
}
