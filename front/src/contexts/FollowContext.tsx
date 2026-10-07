import {User} from "../types/user.ts";
import {createContext, useCallback, useContext, useEffect, useRef, useState} from "react";
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
    const { user, token } = useAuth();
    const requestId = useRef(0);

    const refreshFollowing = useCallback(async () => {
        const currentRequestId = ++requestId.current;
        if (!token || !user) {
            setFollowing([]);
            return;
        }
        try {
            const followingList = await getMyFollowing();
            if (currentRequestId === requestId.current) setFollowing(followingList);
        } catch (error) {
            console.error("Failed to load following", error);
        }
    }, [token, user]);

    useEffect(() => {
        void refreshFollowing();
    }, [refreshFollowing]);

    const isFollowing = (userEmail: string) => {
        return Boolean(token && user && following.some(followedUser => followedUser.email === userEmail));
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
        <FollowContext.Provider value={{ following: token && user ? following : [], isFollowing, toggleFollow, refreshFollowing }}>
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
