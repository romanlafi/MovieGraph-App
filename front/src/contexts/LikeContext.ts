import {createContext} from "react";

export interface LikeContextType {
    likes: number[];
    isLiked: (tmdbMovieId: number) => boolean;
    toggleLike: (tmdbMovieId: number) => Promise<void>;
    refreshLikes: () => Promise<void>;
}

export const LikeContext = createContext<LikeContextType | undefined>(undefined);
