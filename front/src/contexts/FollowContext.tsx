import {User} from "../types/user.ts";
import {createContext, useCallback, useContext, useEffect, useRef, useState} from "react";
import {useAuth} from "../hooks/auth/useAuth.ts";
import * as React from "react";
import {followUser, getMyFollowing, unfollowUser} from "../services/followService.ts";

interface FollowContextType {
    following: User[];
    isFollowing: (publicId: string) => boolean;
    toggleFollow: (publicId: string) => Promise<void>;
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

    const isFollowing = (publicId: string) => {
        return Boolean(token && user && following.some(followedUser => followedUser.public_id === publicId));
    };

    const toggleFollow = async (publicId: string) => {
        if (isFollowing(publicId)) {
            await unfollowUser(publicId);
        } else {
            await followUser(publicId);
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
