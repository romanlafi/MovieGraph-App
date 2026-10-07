import {createContext, useCallback, useContext, useEffect, useRef, useState} from "react";
import {useAuth} from "../hooks/auth/useAuth.ts";
import * as React from "react";
import {getUserLikes, likeMovie, unlikeMovie} from "../services/movieLikesService.ts";

interface LikeContextType {
    likes: number[];
    isLiked: (tmdbMovieId: number) => boolean;
    toggleLike: (tmdbMovieId: number) => Promise<void>;
    refreshLikes: () => Promise<void>;
}

const LikeContext = createContext<LikeContextType | undefined>(undefined);

export const LikeProvider = ({ children }: { children: React.ReactNode }) => {
    const { token } = useAuth();
    const [likes, setLikes] = useState<number[]>([]);
    const requestId = useRef(0);

    const refreshLikes = useCallback(async () => {
        const currentRequestId = ++requestId.current;
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
    }, [token]);

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

export const useLikes = () => {
    const context = useContext(LikeContext);
    if (!context) throw new Error("useLikes must be used within LikeProvider");
    return context;
};
