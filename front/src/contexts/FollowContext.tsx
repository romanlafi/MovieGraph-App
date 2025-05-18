import {User} from "../types/user.ts";
import {createContext, useContext, useEffect, useState} from "react";
import {useAuth} from "../hooks/auth/useAuth.ts";
import * as React from "react";
import {followUser, getMyFollowing, unfollowUser} from "../services/followService.ts";

interface FollowContextType {
    following: User[];
    isFollowing: (userEmail: string) => boolean;
    toggleFollow: (userEmail: string) => Promise<void>;
    refreshFollowing: () => Promise<void>;
}

const FollowContext = createContext<FollowContextType | undefined>(undefined);

export const FollowProvider = ({ children }: { children: React.ReactNode }) => {
    const [following, setFollowing] = useState<User[]>([]);
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            void refreshFollowing();
        }
    }, [user]);

    const refreshFollowing = async () => {
        if (user) {
            const followingList = await getMyFollowing(); // Fetch from API
            setFollowing(followingList);
        }
    };

    const isFollowing = (userEmail: string) => {
        return following.some(user => user.email === userEmail);
    };

    const toggleFollow = async (userEmail: string) => {
        if (isFollowing(userEmail)) {
            await unfollowUser(userEmail); // Call the API to unfollow
        } else {
            await followUser(userEmail); // Call the API to follow
        }
        await refreshFollowing();
    };

    return (
        <FollowContext.Provider value={{ following, isFollowing, toggleFollow, refreshFollowing }}>
            {children}
        </FollowContext.Provider>
    );
};

export const useFollow = () => {
    const context = useContext(FollowContext);
    if (!context) {
        throw new Error("useFollow must be used within a FollowProvider");
    }
    return context;
};