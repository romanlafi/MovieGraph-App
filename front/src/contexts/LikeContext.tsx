import {createContext, useContext, useEffect, useState} from "react";
import {useAuth} from "../hooks/auth/useAuth.ts";
import * as React from "react";
import {getUserLikes, likeMovie, unlikeMovie} from "../services/moviesService.ts";

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

    const refreshLikes = async () => {
        if (!token) return setLikes([]);
        try {
            const data = await getUserLikes();
            setLikes(data);
        } catch (error) {
            console.error("Error fetching likes", error);
        }
    };

    const isLiked = (tmdbMovieId: number) => likes.includes(tmdbMovieId);

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
    }, [token]);

    return (
        <LikeContext.Provider value={{ likes, isLiked, toggleLike, refreshLikes }}>
            {children}
        </LikeContext.Provider>
    );
};

export const useLikes = () => {
    const context = useContext(LikeContext);
    if (!context) throw new Error("useLikes must be used within LikeProvider");
    return context;
};
