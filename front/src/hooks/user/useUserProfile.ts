import {useEffect, useMemo} from "react";
import {useNavigate} from "react-router-dom";
import {getUserByEmail, getUserByPublicId} from "@/services/followService.ts";
import {isNotFoundError} from "@/utils/apiErrors.ts";
import {useAsyncResource} from "@/hooks/useAsyncResource.ts";
import {useAuth} from "@/hooks/auth/useAuth.ts";

const publicIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function useUserProfile(identifier: string | undefined) {
    const {user, token, logout} = useAuth();
    const navigate = useNavigate();
    const isPublicId = Boolean(identifier && publicIdPattern.test(identifier));
    const load = useMemo(() => !identifier ? null : (signal: AbortSignal) => isPublicId
        ? getUserByPublicId(identifier, signal)
        : getUserByEmail(identifier, signal), [identifier, isPublicId]);
    const {data: profile, loading, error, retry} = useAsyncResource(load);
    const redirecting = Boolean(!isPublicId && profile?.public_id);

    useEffect(() => {
        if (redirecting && profile) {
            navigate(`/user/${encodeURIComponent(profile.public_id)}`, {replace: true});
        }
    }, [redirecting, profile, navigate]);

    return {
        profile,
        loading: loading || redirecting,
        error: error ? "Couldn't load this profile. Please try again." : "",
        notFound: !identifier || isNotFoundError(error),
        isCurrentUser: Boolean(token && isPublicId && user?.public_id === identifier),
        retry,
        logout: () => {
            logout();
            navigate("/");
        },
    };
}
