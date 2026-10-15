import {useMemo} from "react";
import {useAuth} from "@/hooks/auth/useAuth.ts";
import {useAsyncResource} from "@/hooks/useAsyncResource.ts";
import {getMyFollowers, getMyFollowing} from "@/services/followService.ts";

export function useUserNetwork(enabled = true) {
    const {token, user} = useAuth();
    const publicId = user?.public_id;
    const load = useMemo(() => {
        if (!enabled || !token || !publicId) return null;
        return async (signal: AbortSignal) => {
            const [followers, following] = await Promise.all([
                getMyFollowers(signal),
                getMyFollowing(signal),
            ]);
            return {followers, following};
        };
    }, [enabled, token, publicId]);
    const {data, loading, error, retry} = useAsyncResource(load);
    return {followers: data?.followers ?? [], following: data?.following ?? [], loading, error, refresh: retry};
}
