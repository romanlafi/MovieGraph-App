import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({
    clearSessionToken: vi.fn(),
    fetchUser: vi.fn(),
    followUser: vi.fn(),
    getMyFollowing: vi.fn(),
    getSessionToken: vi.fn(),
    getUserLikes: vi.fn(),
    likeMovie: vi.fn(),
    setSessionToken: vi.fn(),
    subscribeToSession: vi.fn(),
    unfollowUser: vi.fn(),
    unlikeMovie: vi.fn(),
    useAuth: vi.fn(),
}));

vi.mock("@/services/session.ts", () => ({
    clearSessionToken: mocks.clearSessionToken,
    getSessionToken: mocks.getSessionToken,
    setSessionToken: mocks.setSessionToken,
    subscribeToSession: mocks.subscribeToSession,
}));
vi.mock("@/services/authService.ts", () => ({fetchUser: mocks.fetchUser}));
vi.mock("@/services/followService.ts", () => ({
    followUser: mocks.followUser,
    getMyFollowing: mocks.getMyFollowing,
    unfollowUser: mocks.unfollowUser,
}));
vi.mock("@/services/movieLikesService.ts", () => ({
    getUserLikes: mocks.getUserLikes,
    likeMovie: mocks.likeMovie,
    unlikeMovie: mocks.unlikeMovie,
}));
vi.mock("@/hooks/auth/useAuth.ts", () => ({useAuth: mocks.useAuth}));

import {AuthProvider} from "@/contexts/AuthProvider.tsx";
import {AuthContext} from "@/contexts/AuthContext.ts";
import {FollowProvider} from "@/contexts/FollowProvider.tsx";
import {FollowContext, type FollowContextType} from "@/contexts/FollowContext.ts";
import {LikeProvider} from "@/contexts/LikeProvider.tsx";
import {LikeContext, type LikeContextType} from "@/contexts/LikeContext.ts";

describe("context providers", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSessionToken.mockReturnValue(null);
        mocks.subscribeToSession.mockReturnValue(() => undefined);
        mocks.getMyFollowing.mockResolvedValue([]);
        mocks.getUserLikes.mockResolvedValue([]);
        mocks.useAuth.mockReturnValue({token: null, user: null, isLoading: false});
    });

    it("exposes the session state and delegates auth actions", () => {
        let authValue: React.ContextType<typeof AuthContext> | undefined;
        const markup = renderToStaticMarkup(
            <AuthProvider>
                <AuthContext.Consumer>{(value) => {
                    authValue = value;
                    return <output>{value.isLoading ? "loading" : "ready"}</output>;
                }}</AuthContext.Consumer>
            </AuthProvider>,
        );

        expect(markup).toContain("ready");
        expect(authValue?.user).toBeNull();
        expect(authValue?.token).toBeNull();
        authValue?.login("session-token");
        authValue?.logout();
        authValue?.retrySession();
        expect(mocks.setSessionToken).toHaveBeenCalledWith("session-token");
        expect(mocks.clearSessionToken).toHaveBeenCalledOnce();
    });

    it("exposes follow state and performs follow actions", async () => {
        mocks.useAuth.mockReturnValue({token: "session-token", user: {public_id: "me"}, isLoading: false});
        let followValue: FollowContextType | undefined;
        renderToStaticMarkup(
            <FollowProvider>
                <FollowContext.Consumer>{(value) => {
                    followValue = value;
                    return <output>{value?.following.length ?? 0}</output>;
                }}</FollowContext.Consumer>
            </FollowProvider>,
        );

        expect(followValue?.following).toEqual([]);
        expect(followValue?.isFollowing("someone")).toBe(false);
        await followValue?.toggleFollow("someone");
        await followValue?.refreshFollowing();
        expect(mocks.followUser).toHaveBeenCalledWith("someone");
        expect(mocks.getMyFollowing).toHaveBeenCalled();
    });

    it("exposes like state and toggles a movie like", async () => {
        mocks.useAuth.mockReturnValue({token: "session-token", user: null, isLoading: false});
        let likeValue: LikeContextType | undefined;
        renderToStaticMarkup(
            <LikeProvider>
                <LikeContext.Consumer>{(value) => {
                    likeValue = value;
                    return <output>{value?.likes.length ?? 0}</output>;
                }}</LikeContext.Consumer>
            </LikeProvider>,
        );

        expect(likeValue?.likes).toEqual([]);
        expect(likeValue?.isLiked(550)).toBe(false);
        await likeValue?.toggleLike(550);
        await likeValue?.refreshLikes();
        expect(mocks.likeMovie).toHaveBeenCalledWith(550);
        expect(mocks.getUserLikes).toHaveBeenCalled();
    });
});
