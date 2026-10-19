// @vitest-environment jsdom
import axios from "axios";
import {act, fireEvent, render, renderHook, screen, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({
    getCollections: vi.fn(),
    getCommentsByMovie: vi.fn(),
    getGenres: vi.fn(),
    getLatestMovies: vi.fn(),
    getMovieByTmdbId: vi.fn(),
    getMoviesByTmdbGenreId: vi.fn(),
    getMyFollowers: vi.fn(),
    getMyFollowing: vi.fn(),
    getPersonByTmdbId: vi.fn(),
    getRandomCollection: vi.fn(),
    getRandomMovies: vi.fn(),
    getRandomPeople: vi.fn(),
    getTopRatedMovies: vi.fn(),
    getUserByEmail: vi.fn(),
    getUserByPublicId: vi.fn(),
    fetchUser: vi.fn(),
    login: vi.fn(),
    loginUser: vi.fn(),
    registerUser: vi.fn(),
    searchTmdbMovies: vi.fn(),
    searchUsers: vi.fn(),
    postComment: vi.fn(),
    useAuth: vi.fn(),
}));

vi.mock("@/services/authService.ts", () => ({
    fetchUser: mocks.fetchUser,
    loginUser: mocks.loginUser,
    registerUser: mocks.registerUser,
}));
vi.mock("@/hooks/auth/useAuth.ts", () => ({useAuth: mocks.useAuth}));
vi.mock("@/services/moviesService.ts", () => ({
    getCollections: mocks.getCollections,
    getGenres: mocks.getGenres,
    getLatestMovies: mocks.getLatestMovies,
    getMovieByTmdbId: mocks.getMovieByTmdbId,
    getMoviesByTmdbGenreId: mocks.getMoviesByTmdbGenreId,
    getRandomCollection: mocks.getRandomCollection,
    getRandomMovies: mocks.getRandomMovies,
    getTopRatedMovies: mocks.getTopRatedMovies,
}));
vi.mock("@/services/tmdbService.ts", () => ({searchTmdbMovies: mocks.searchTmdbMovies}));
vi.mock("@/services/commentService.ts", () => ({getCommentsByMovie: mocks.getCommentsByMovie, postComment: mocks.postComment}));
vi.mock("@/services/peopleService.ts", () => ({getRandomPeople: mocks.getRandomPeople, getPersonByTmdbId: mocks.getPersonByTmdbId}));
vi.mock("@/services/followService.ts", () => ({
    searchUsers: mocks.searchUsers,
    getMyFollowers: mocks.getMyFollowers,
    getMyFollowing: mocks.getMyFollowing,
    getUserByEmail: mocks.getUserByEmail,
    getUserByPublicId: mocks.getUserByPublicId,
}));

import {useLoginForm} from "@/hooks/auth/useLoginForm.ts";
import {useRegistrationForm} from "@/hooks/auth/useRegistrationForm.ts";
import {useAsyncResource} from "@/hooks/useAsyncResource.ts";
import {usePaginatedMovies} from "@/hooks/movie/usePaginatedMovies.ts";
import {useUserSearch} from "@/hooks/user/useUserSearch.ts";
import {useCollections} from "@/hooks/collection/useCollections.ts";
import {useMovieSearch} from "@/hooks/movie/useMovieSearch.ts";
import {useMovieComments} from "@/hooks/movie/useMovieComments.ts";
import {useExploreGenres} from "@/hooks/genre/useExploreGenres.ts";
import {useUserNetwork} from "@/hooks/user/useUserNetwork.ts";
import {useMoviesByGenre} from "@/hooks/genre/useMoviesByGenre.ts";
import {useHomeData} from "@/hooks/useHomeData.ts";
import {useUserProfile} from "@/hooks/user/useUserProfile.ts";
import {MemoryRouter} from "react-router-dom";
import {AuthContext} from "@/contexts/AuthContext.ts";
import {AuthProvider} from "@/contexts/AuthProvider.tsx";

describe("stateful frontend hooks", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.useAuth.mockReturnValue({login: mocks.login, logout: vi.fn(), user: null, token: null});
        mocks.loginUser.mockResolvedValue("access-token");
        mocks.registerUser.mockResolvedValue({id: 1});
        mocks.searchUsers.mockResolvedValue([]);
        mocks.getCollections.mockResolvedValue([]);
        mocks.getGenres.mockResolvedValue([]);
        mocks.getMyFollowers.mockResolvedValue([]);
        mocks.getMyFollowing.mockResolvedValue([]);
        mocks.getCommentsByMovie.mockResolvedValue([]);
        mocks.postComment.mockResolvedValue({comment_id: 3, text: "New comment"});
        mocks.searchTmdbMovies.mockResolvedValue({results: [], page: 1, totalPages: 1});
        mocks.getLatestMovies.mockResolvedValue([]);
        mocks.getMovieByTmdbId.mockResolvedValue({tmdbId: 550});
        mocks.getMoviesByTmdbGenreId.mockResolvedValue([]);
        mocks.getPersonByTmdbId.mockResolvedValue({tmdbId: 287});
        mocks.getRandomCollection.mockResolvedValue(null);
        mocks.getRandomMovies.mockResolvedValue([]);
        mocks.getRandomPeople.mockResolvedValue([]);
        mocks.getTopRatedMovies.mockResolvedValue([]);
        mocks.getUserByEmail.mockResolvedValue({public_id: "user-public-id"});
        mocks.getUserByPublicId.mockResolvedValue({public_id: "user-public-id"});
        mocks.fetchUser.mockResolvedValue({public_id: "user-public-id", username: "cinefan"});
    });

    it("loads, retries, clears and reports asynchronous resources", async () => {
        const load = vi.fn().mockResolvedValue({value: 1});
        const hook = renderHook(() => useAsyncResource(load));
        await waitFor(() => expect(hook.result.current.data).toEqual({value: 1}));
        expect(hook.result.current.loading).toBe(false);
        act(() => hook.result.current.retry());
        await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
        const disabled = renderHook(() => useAsyncResource(null));
        expect(disabled.result.current).toMatchObject({data: null, loading: false, error: null});
        const failingLoad = vi.fn().mockRejectedValue(new Error("network"));
        const failed = renderHook(() => useAsyncResource(failingLoad));
        await waitFor(() => expect(failed.result.current.error).toBeInstanceOf(Error));
        expect(failed.result.current.loading).toBe(false);
    });

    it("submits login credentials and maps unauthorized failures", async () => {
        const succeeded = vi.fn();
        const hook = renderHook(() => useLoginForm(succeeded));
        act(() => {
            hook.result.current.updateField("email", "cinefan@example.test");
            hook.result.current.updateField("password", "secret");
        });
        await act(async () => hook.result.current.submit());
        expect(mocks.loginUser).toHaveBeenCalledWith("cinefan@example.test", "secret");
        expect(mocks.login).toHaveBeenCalledWith("access-token");
        expect(succeeded).toHaveBeenCalledOnce();

        const isAxiosError = vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
        mocks.loginUser.mockRejectedValueOnce({response: {status: 401}});
        const rejected = renderHook(() => useLoginForm(vi.fn()));
        await act(async () => rejected.result.current.submit());
        expect(rejected.result.current.error).toBe("Wrong email or password");
        isAxiosError.mockRestore();
        mocks.loginUser.mockRejectedValueOnce(new Error("offline"));
        await act(async () => rejected.result.current.submit());
        expect(rejected.result.current.error).toContain("temporarily unavailable");
    });

    it("validates registration, toggles genres and maps successful and server responses", async () => {
        const hook = renderHook(() => useRegistrationForm());
        await act(async () => hook.result.current.submit());
        expect(hook.result.current.error).toContain("highlighted fields");
        expect(hook.result.current.fieldErrors.username).toContain("username");

        act(() => {
            hook.result.current.updateField("username", " cinefan ");
            hook.result.current.updateField("email", " cinefan@example.test ");
            hook.result.current.updateField("password", "long-enough-pass");
            hook.result.current.updateField("birthdate", "1990-01-01");
            hook.result.current.toggleGenre("Drama");
            hook.result.current.toggleGenre("Drama");
            hook.result.current.toggleGenre("Comedy");
        });
        expect(hook.result.current.form.favorite_genres).toEqual(["Comedy"]);
        await act(async () => hook.result.current.submit());
        expect(mocks.registerUser).toHaveBeenCalledWith(expect.objectContaining({
            username: " cinefan ", email: "cinefan@example.test", favorite_genres: ["Comedy"],
        }));
        expect(hook.result.current.isRegistered).toBe(true);
        await act(async () => hook.result.current.submit());
        expect(mocks.registerUser).toHaveBeenCalledOnce();

        vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
        mocks.registerUser.mockRejectedValueOnce({response: {data: {detail: {error: "user_conflict", message: "Username taken"}}}});
        const serverRejected = renderHook(() => useRegistrationForm());
        act(() => {
            serverRejected.result.current.updateField("username", "cinefan");
            serverRejected.result.current.updateField("email", "cinefan@example.test");
            serverRejected.result.current.updateField("password", "long-enough-pass");
            serverRejected.result.current.updateField("birthdate", "1990-01-01");
        });
        await act(async () => serverRejected.result.current.submit());
        expect(serverRejected.result.current.error).toBe("Username taken");
        expect(serverRejected.result.current.fieldErrors.username).toContain("already taken");
        vi.restoreAllMocks();
    });

    it("paginates results, stops on short pages and reports failed requests", async () => {
        const fetchPage = vi.fn()
            .mockResolvedValueOnce([{tmdbId: 1}, {tmdbId: 2}])
            .mockResolvedValueOnce([{tmdbId: 3}]);
        const hook = renderHook(() => usePaginatedMovies(fetchPage, 2));
        await waitFor(() => expect(hook.result.current.loading).toBe(false));
        expect(fetchPage).toHaveBeenCalledWith(1, 2, expect.any(AbortSignal));
        expect(hook.result.current.hasMore).toBe(true);
        await act(async () => hook.result.current.loadMore());
        expect(hook.result.current.movies.map(movie => movie.tmdbId)).toEqual([1, 2, 3]);
        expect(hook.result.current.hasMore).toBe(false);
        await act(async () => hook.result.current.loadMore());
        expect(fetchPage).toHaveBeenCalledTimes(2);

        const failPage = vi.fn().mockRejectedValue(new Error("offline"));
        const failed = renderHook(() => usePaginatedMovies(failPage, 5));
        await waitFor(() => expect(failed.result.current.error).toContain("Couldn't load movies"));
        const disabled = renderHook(() => usePaginatedMovies(fetchPage, 5, false));
        expect(disabled.result.current).toMatchObject({loading: false, hasMore: false, movies: []});
    });

    it("searches only valid queries and clears or reports results", async () => {
        const hook = renderHook(() => useUserSearch());
        await act(async () => hook.result.current.search());
        expect(hook.result.current.searchError).toContain("two characters");
        act(() => hook.result.current.updateQuery("  cinefan  "));
        mocks.searchUsers.mockResolvedValueOnce([{public_id: "friend"}]);
        await act(async () => hook.result.current.search());
        expect(mocks.searchUsers).toHaveBeenCalledWith("cinefan", expect.any(AbortSignal));
        expect(hook.result.current).toMatchObject({searchedQuery: "cinefan", results: [{public_id: "friend"}], searching: false});
        act(() => hook.result.current.updateQuery("someone"));
        mocks.searchUsers.mockRejectedValueOnce(new Error("offline"));
        await act(async () => hook.result.current.search());
        expect(hook.result.current.searchError).toContain("Couldn't search for people");
    });

    it("loads collections, exposes paging and supports retry after failure", async () => {
        const collections = Array.from({length: 7}, (_, index) => ({tmdbId: index + 1}));
        mocks.getCollections.mockResolvedValueOnce(collections);
        const hook = renderHook(() => useCollections());
        await waitFor(() => expect(hook.result.current.loading).toBe(false));
        expect(hook.result.current.visibleCollections).toHaveLength(5);
        expect(hook.result.current.hasMore).toBe(true);
        act(() => hook.result.current.loadMore());
        expect(hook.result.current.visibleCollections).toHaveLength(7);
        expect(hook.result.current.hasMore).toBe(false);

        mocks.getCollections.mockRejectedValueOnce(new Error("offline"));
        const failed = renderHook(() => useCollections());
        await waitFor(() => expect(failed.result.current.error).toContain("Couldn't load collections"));
        mocks.getCollections.mockResolvedValueOnce([]);
        act(() => failed.result.current.retry());
        await waitFor(() => expect(failed.result.current.error).toBeNull());
        expect(mocks.getCollections).toHaveBeenCalledTimes(3);
    });

    it("debounces movie search, pages results and retries both request types", async () => {
        vi.useFakeTimers();
        mocks.searchTmdbMovies.mockResolvedValueOnce({results: [{tmdbId: 1}], page: 1, totalPages: 2});
        const hook = renderHook(() => useMovieSearch());
        act(() => hook.result.current.updateQuery("  alien  "));
        await act(async () => vi.advanceTimersByTimeAsync(300));
        expect(mocks.searchTmdbMovies).toHaveBeenLastCalledWith("alien", 1, expect.any(AbortSignal));
        expect(hook.result.current).toMatchObject({status: "success", hasMore: true, results: [{tmdbId: 1}]});
        mocks.searchTmdbMovies.mockResolvedValueOnce({results: [{tmdbId: 2}], page: 2, totalPages: 2});
        await act(async () => hook.result.current.loadMore());
        expect(hook.result.current).toMatchObject({page: 2, hasMore: false, results: [{tmdbId: 1}, {tmdbId: 2}]});
        await act(async () => hook.result.current.loadMore());
        expect(mocks.searchTmdbMovies).toHaveBeenCalledTimes(2);

        mocks.searchTmdbMovies.mockRejectedValueOnce(new Error("offline"));
        act(() => hook.result.current.updateQuery("batman"));
        await act(async () => vi.advanceTimersByTimeAsync(300));
        expect(hook.result.current.status).toBe("error");
        mocks.searchTmdbMovies.mockResolvedValueOnce({results: [{tmdbId: 3}], page: 1, totalPages: 2});
        act(() => hook.result.current.retry());
        await act(async () => vi.advanceTimersByTimeAsync(300));
        expect(hook.result.current.status).toBe("success");
        mocks.searchTmdbMovies.mockRejectedValueOnce(new Error("offline"));
        await act(async () => hook.result.current.loadMore());
        expect(hook.result.current.loadMoreError).toContain("Couldn't load more");
        mocks.searchTmdbMovies.mockResolvedValueOnce({results: [{tmdbId: 4}], page: 2, totalPages: 2});
        await act(async () => hook.result.current.retryMore());
        expect(hook.result.current.loadMoreError).toBeNull();
        vi.useRealTimers();
    });

    it("combines newly posted comments with fetched comments without duplicates", async () => {
        mocks.getCommentsByMovie.mockResolvedValueOnce([{comment_id: 1, text: "Existing"}, {comment_id: 2, text: "Same id"}]);
        const hook = renderHook(() => useMovieComments(550));
        await waitFor(() => expect(hook.result.current.loading).toBe(false));
        expect(hook.result.current.comments).toHaveLength(2);
        mocks.postComment.mockResolvedValueOnce({comment_id: 2, text: "Updated"});
        await act(async () => hook.result.current.submit("Updated"));
        expect(hook.result.current.comments.map(comment => comment.comment_id)).toEqual([2, 1]);
        await act(async () => hook.result.current.submit("New comment"));
        expect(hook.result.current.comments[0].text).toBe("New comment");
    });

    it("sorts genres, gates pagination during child loads and resets on retry", async () => {
        mocks.getGenres.mockResolvedValueOnce([
            {tmdbId: 3, name: "Drama"}, {tmdbId: 1, name: "Action"}, {tmdbId: 2, name: "Comedy"},
            {tmdbId: 4, name: "Family"}, {tmdbId: 5, name: "Horror"},
        ]);
        const hook = renderHook(() => useExploreGenres());
        await waitFor(() => expect(hook.result.current.loading).toBe(false));
        expect(hook.result.current.visibleGenres.map(genre => genre.name)).toEqual(["Action", "Comedy", "Drama"]);
        act(() => hook.result.current.loadMoreGenres());
        expect(hook.result.current.visibleGenres).toHaveLength(5);
        expect(hook.result.current.loadingMore).toBe(true);
        act(() => hook.result.current.setGenreLoading(4, false));
        act(() => hook.result.current.setGenreLoading(5, false));
        expect(hook.result.current.loadingMore).toBe(false);
        act(() => hook.result.current.retry());
        expect(hook.result.current.visibleGenres).toHaveLength(3);
    });

    it("loads authenticated social network data and supports disabled state", async () => {
        mocks.useAuth.mockReturnValue({token: "session", user: {public_id: "me"}});
        mocks.getMyFollowers.mockResolvedValueOnce([{public_id: "follower"}]);
        mocks.getMyFollowing.mockResolvedValueOnce([{public_id: "following"}]);
        const hook = renderHook(() => useUserNetwork());
        await waitFor(() => expect(hook.result.current.loading).toBe(false));
        expect(hook.result.current.followers).toEqual([{public_id: "follower"}]);
        expect(hook.result.current.following).toEqual([{public_id: "following"}]);
        const disabled = renderHook(() => useUserNetwork(false));
        expect(disabled.result.current).toMatchObject({followers: [], following: [], loading: false});
    });

    it("loads the homepage resources together and retries only failed sections", async () => {
        mocks.getRandomMovies.mockResolvedValueOnce([{tmdbId: 1}]);
        mocks.getLatestMovies.mockRejectedValueOnce(new Error("latest unavailable"));
        mocks.getRandomPeople.mockResolvedValueOnce([{tmdbId: 7}]);
        mocks.getRandomCollection.mockResolvedValueOnce({tmdbId: 4, movies: []});
        mocks.getTopRatedMovies.mockResolvedValueOnce([{tmdbId: 2}]);
        const hook = renderHook(() => useHomeData());
        await waitFor(() => expect(hook.result.current.loading).toBe(false));
        expect(hook.result.current).toMatchObject({
            featuredMovies: [{tmdbId: 1}], featuredPeople: [{tmdbId: 7}],
            featuredCollection: {tmdbId: 4}, topRated: [{tmdbId: 2}], error: true,
        });
        mocks.getLatestMovies.mockResolvedValueOnce([{tmdbId: 3}]);
        act(() => hook.result.current.retry());
        await waitFor(() => expect(hook.result.current.error).toBe(false));
        expect(hook.result.current.latestReleases).toEqual([{tmdbId: 3}]);
        expect(mocks.getRandomMovies).toHaveBeenCalledOnce();
    });

    it("resolves genre names to TMDB IDs, paginates and retries failed genre lookup", async () => {
        mocks.getGenres.mockResolvedValueOnce([{tmdbId: 18, name: "Drama"}]);
        mocks.getMoviesByTmdbGenreId.mockResolvedValueOnce([{tmdbId: 550}]);
        const hook = renderHook(() => useMoviesByGenre("dRaMa"));
        await waitFor(() => expect(hook.result.current.loading).toBe(false));
        expect(mocks.getMoviesByTmdbGenreId).toHaveBeenCalledWith(18, 1, 18, expect.any(AbortSignal));
        expect(hook.result.current.movies).toEqual([{tmdbId: 550}]);
        const missingGenre = renderHook(() => useMoviesByGenre("unknown"));
        await waitFor(() => expect(missingGenre.result.current.loading).toBe(false));
        expect(mocks.getMoviesByTmdbGenreId).toHaveBeenCalledTimes(1);

        mocks.getGenres.mockRejectedValueOnce(new Error("genre lookup failed"));
        const failed = renderHook(() => useMoviesByGenre("Drama"));
        await waitFor(() => expect(failed.result.current.error).toContain("Couldn't load movies"));
        mocks.getGenres.mockResolvedValueOnce([{tmdbId: 18, name: "Drama"}]);
        act(() => { void failed.result.current.loadMore(); });
        await waitFor(() => expect(failed.result.current.error).toBeNull());
    });

    it("loads user profiles by identifier and exposes not-found and logout state", async () => {
        const wrapper = ({children}: {children: React.ReactNode}) => <MemoryRouter>{children}</MemoryRouter>;
        mocks.useAuth.mockReturnValue({
            token: "session",
            user: {public_id: "11111111-1111-4111-8111-111111111111"},
            logout: mocks.login,
        });
        const emailLookup = renderHook(() => useUserProfile("cinefan@example.test"), {wrapper});
        await waitFor(() => expect(emailLookup.result.current.profile?.public_id).toBe("user-public-id"));
        expect(mocks.getUserByEmail).toHaveBeenCalledWith("cinefan@example.test", expect.any(AbortSignal));
        expect(emailLookup.result.current.loading).toBe(true);

        const publicId = "11111111-1111-4111-8111-111111111111";
        mocks.getUserByPublicId.mockResolvedValueOnce({public_id: publicId});
        const ownProfile = renderHook(() => useUserProfile(publicId), {wrapper});
        await waitFor(() => expect(ownProfile.result.current.loading).toBe(false));
        expect(ownProfile.result.current.isCurrentUser).toBe(true);
        act(() => ownProfile.result.current.logout());
        expect(mocks.login).toHaveBeenCalled();

        const missing = renderHook(() => useUserProfile(undefined), {wrapper});
        expect(missing.result.current.notFound).toBe(true);
    });

    it("restores, retries, and clears authenticated sessions", async () => {
        localStorage.setItem("access_token", "session-token");
        mocks.fetchUser.mockResolvedValueOnce({public_id: "user", username: "cinefan"});
        const authView = render(
            <AuthProvider>
                <AuthContext.Consumer>{value => <><output>{value.isLoading ? "Loading profile" : value.user?.username ?? "Ready"}</output>
                    <button onClick={value.retrySession}>Retry</button></>}</AuthContext.Consumer>
            </AuthProvider>,
        );
        expect(await screen.findByText("cinefan")).toBeTruthy();
        expect(mocks.fetchUser).toHaveBeenCalledWith("session-token", expect.any(AbortSignal));

        mocks.fetchUser.mockRejectedValueOnce(new Error("temporary"));
        fireEvent.click(screen.getByRole("button", {name: "Retry"}));
        await waitFor(() => expect(mocks.fetchUser).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(screen.getByText("Ready")).toBeTruthy());
        authView.unmount();

        localStorage.setItem("access_token", "expired-token");
        vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
        mocks.fetchUser.mockRejectedValueOnce({response: {status: 401}});
        render(<AuthProvider><AuthContext.Consumer>{value => <output>{value.user?.username ?? "Signed out"}</output>}</AuthContext.Consumer></AuthProvider>);
        await waitFor(() => expect(localStorage.getItem("access_token")).toBeNull());
        expect(screen.getByText("Signed out")).toBeTruthy();
        vi.restoreAllMocks();
    });
});
