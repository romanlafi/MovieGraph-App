import {Movie} from "../types/movie.ts";
import {createContext, useContext, useEffect, useState} from "react";
import {useAuth} from "../hooks/useAuth.tsx";
import * as React from "react";
import {getUserLikes, likeMovie, unlikeMovie} from "../services/moviesService.ts";

interface LikeContextType {
    likes: Movie[];
    isLiked: (movieId: string) => boolean;
    toggleLike: (movieId: string) => Promise<void>;
    refreshLikes: () => Promise<void>;
}

const LikeContext = createContext<LikeContextType | undefined>(undefined);

export const LikeProvider = ({ children }: { children: React.ReactNode }) => {
    const { token } = useAuth();
    const [likes, setLikes] = useState<Movie[]>([]);

    const refreshLikes = async () => {
        if (!token) return setLikes([]);
        try {
            const data = await getUserLikes();
            setLikes(data);
        } catch (error) {
            console.error("Error fetching likes", error);
        }
    };

    const toggleLike = async (movieId: string) => {
        try {
            if (likes.some((m) => m.id === movieId)) {
                await unlikeMovie(movieId);
            } else {
                await likeMovie(movieId);
            }
            await refreshLikes();
        } catch (error) {
            console.error("Failed to toggle like", error);
        }
    };

    const isLiked = (movieId: string) => likes.some((m) => m.id === movieId);

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