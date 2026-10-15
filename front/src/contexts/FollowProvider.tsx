import type {User} from "@/types/user.ts";
import {useCallback, useEffect, useRef, useState} from "react";
import type {ReactNode} from "react";
import {useAuth} from "@/hooks/auth/useAuth.ts";
import {FollowContext} from "./FollowContext.ts";
import {followUser, getMyFollowing, unfollowUser} from "@/services/followService.ts";

export const FollowProvider = ({ children }: { children: ReactNode }) => {
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

