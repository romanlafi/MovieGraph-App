import {useCallback, useEffect, useRef, useState} from "react";
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

    const isLiked = (tmdbMovieId: number) => Boolean(token && likes.includes(tmdbMovieId));

    const toggleLike = async (tmdbMovieId: number) => {
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
    };

    useEffect(() => {
        void refreshLikes();
    }, [refreshLikes]);

    return (
        <LikeContext.Provider value={{ likes: token ? likes : [], isLiked, toggleLike, refreshLikes }}>
            {children}
        </LikeContext.Provider>
    );
};

