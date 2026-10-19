import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {ReactNode} from "react";
import {useAuth} from "@/hooks/auth/useAuth.ts";
import {LikeContext} from "./LikeContext.ts";
import {getUserLikes, likeMovie, unlikeMovie} from "@/services/movieLikesService.ts";

export const LikeProvider = ({ children }: { children: ReactNode }) => {
    const { token, isLoading } = useAuth();
    const [likes, setLikes] = useState<number[]>([]);
    const requestId = useRef(0);

    const refreshLikes = useCallback(async () => {
        const currentRequestId = ++requestId.current;
        if (isLoading) return;
        if (!token) {
            setLikes([]);
            return;
        }
        try {
            const data = await getUserLikes();
            if (currentRequestId === requestId.current) setLikes(data);
        } catch (error) {
            console.error("Error fetching likes", error);
        }
    }, [token, isLoading]);

    const isLiked = useCallback((tmdbMovieId: number) => Boolean(token && likes.includes(tmdbMovieId)), [token, likes]);

    const toggleLike = useCallback(async (tmdbMovieId: number) => {
        try {
            if (isLiked(tmdbMovieId)) {
                await unlikeMovie(tmdbMovieId);
            } else {
                await likeMovie(tmdbMovieId);
            }
            await refreshLikes();
        } catch (error) {
            console.error("Failed to toggle like", error);
        }
    }, [isLiked, refreshLikes]);

    useEffect(() => {
        void refreshLikes();
    }, [refreshLikes]);

    const contextValue = useMemo(() => ({
        likes: token ? likes : [],
        isLiked,
        toggleLike,
        refreshLikes,
    }), [token, likes, isLiked, toggleLike, refreshLikes]);

    return (
        <LikeContext.Provider value={contextValue}>
            {children}
        </LikeContext.Provider>
    );
};

