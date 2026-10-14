import {createContext} from "react";
import type {User} from "../types/user.ts";

export interface FollowContextType {
    following: User[];
    isFollowing: (publicId: string) => boolean;
    toggleFollow: (publicId: string) => Promise<void>;
    refreshFollowing: () => Promise<void>;
}

export const FollowContext = createContext<FollowContextType | undefined>(undefined);
