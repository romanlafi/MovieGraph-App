// @vitest-environment jsdom
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({useAuth: vi.fn(), useFollow: vi.fn(), useLikes: vi.fn(), useMovieSearch: vi.fn()}));
vi.mock("@/hooks/auth/useAuth.ts", () => ({useAuth: mocks.useAuth}));
vi.mock("@/hooks/user/useFollow.ts", () => ({useFollow: mocks.useFollow}));
vi.mock("@/hooks/movie/useLikes.ts", () => ({useLikes: mocks.useLikes}));
vi.mock("@/hooks/movie/useMovieSearch.ts", () => ({useMovieSearch: mocks.useMovieSearch}));

import CategoryOverlay from "@/components/layout/CategoryOverlay.tsx";
import HeroMovieSlider from "@/components/hero/HeroMovieSlider.tsx";
import SearchBar from "@/components/search/SearchBar.tsx";
import FollowButton from "@/components/user/FollowButton.tsx";
import LikeButton from "@/components/movie/LikeButton.tsx";
import {useHeaderPanels} from "@/hooks/useHeaderPanels.ts";
import {useLocation} from "react-router-dom";
import {act, renderHook} from "@testing-library/react";

const searchState = (overrides: Record<string, unknown> = {}) => ({
    query: "",
    results: [],
    status: "idle",
    error: null,
    updateQuery: vi.fn(),
    clear: vi.fn(),
    retry: vi.fn(),
    loadMore: vi.fn(),
    retryMore: vi.fn(),
    hasMore: false,
    loadingMore: false,
    loadMoreError: null,
    ...overrides,
});

describe("interactive navigation and search", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.useAuth.mockReturnValue({user: null, token: null});
        mocks.useFollow.mockReturnValue({isFollowing: vi.fn().mockReturnValue(false), toggleFollow: vi.fn()});
        mocks.useLikes.mockReturnValue({isLiked: vi.fn().mockReturnValue(false), toggleLike: vi.fn()});
        mocks.useMovieSearch.mockReturnValue(searchState());
        window.matchMedia = vi.fn().mockReturnValue({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }) as unknown as typeof window.matchMedia;
        Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
            configurable: true,
            value: vi.fn(function (this: HTMLDialogElement) { this.open = true; }),
        });
        Object.defineProperty(HTMLDialogElement.prototype, "close", {
            configurable: true,
            value: vi.fn(function (this: HTMLDialogElement) { this.open = false; }),
        });
        Object.defineProperty(HTMLElement.prototype, "animate", {
            configurable: true,
            value: vi.fn(() => ({cancel: vi.fn(), onfinish: null})),
        });
    });

    it("toggles header panels on outside input, Escape and desktop resize", () => {
        const trigger = document.createElement("button");
        const header = document.createElement("header");
        const desktopMedia = {
            matches: false,
            addEventListener: (_type: string, listener: EventListener) => { onChange = listener; },
            removeEventListener: vi.fn(),
        };
        let onChange: EventListener | undefined;
        window.matchMedia = vi.fn().mockReturnValue(desktopMedia) as unknown as typeof window.matchMedia;
        document.body.append(trigger, header);
        trigger.focus();
        const {result} = renderHook(() => useHeaderPanels(), {wrapper: MemoryRouter});
        result.current.headerRef.current = header;
        act(() => result.current.togglePanel("search"));
        expect(result.current.panel).toBe("search");
        fireEvent.pointerDown(header);
        expect(result.current.panel).toBe("search");
        fireEvent.pointerDown(document.body);
        expect(result.current.panel).toBeNull();

        act(() => result.current.togglePanel("login"));
        fireEvent.keyDown(document, {key: "Escape"});
        expect(result.current.panel).toBeNull();
        expect(document.activeElement).toBe(trigger);
        act(() => result.current.togglePanel("menu"));
        fireEvent.pointerDown(document.body);
        expect(result.current.panel).toBe("menu");
        act(() => result.current.closePanelAndRestoreFocus());
        expect(result.current.panel).toBeNull();

        act(() => result.current.togglePanel("search"));
        desktopMedia.matches = true;
        act(() => onChange?.(new Event("change")));
        expect(result.current.panel).toBeNull();
        header.remove();
        trigger.remove();
    });

    it("opens and closes category dialog, restores scroll and varies links by session", () => {
        const close = vi.fn();
        document.body.style.overflow = "auto";
        mocks.useAuth.mockReturnValue({user: {public_id: "user"}, token: "token"});
        const view = render(<CategoryOverlay open onClose={close} />, {wrapper: MemoryRouter});
        const dialog = screen.getByRole("dialog", {name: "Categories"}) as HTMLDialogElement;
        expect(dialog.open).toBe(true);
        expect(document.body.style.overflow).toBe("hidden");
        expect(screen.getByText("Recommended for You")).toBeTruthy();
        fireEvent.click(screen.getByRole("link", {name: "Genres"}));
        expect(close).toHaveBeenCalled();

        view.rerender(<CategoryOverlay open={false} onClose={close} />);
        const animation = vi.mocked(HTMLElement.prototype.animate).mock.results.at(-1)?.value as {
            onfinish: ((event: AnimationPlaybackEvent) => void) | null;
        };
        act(() => animation.onfinish?.({} as AnimationPlaybackEvent));
        expect(dialog.open).toBe(false);
        expect(document.body.style.overflow).toBe("auto");
    });

    it("opens movie results, supports selection, escape, outside clicks and pagination", () => {
        const state = searchState({
            query: "alien",
            results: [{tmdbId: 1, title: "Alien", year: 1979, rating: 8.5, poster_url: "/alien.jpg"}],
            status: "success",
            hasMore: true,
        });
        mocks.useMovieSearch.mockReturnValue(state);
        const onSelect = vi.fn();
        const view = render(<SearchBar autoFocus onSelect={onSelect} />, {wrapper: MemoryRouter});
        const input = screen.getByRole("textbox", {name: "Search movies"});
        fireEvent.change(input, {target: {value: "Alien"}});
        expect(state.updateQuery).toHaveBeenCalledWith("Alien");
        expect(screen.getByRole("list", {name: "Movie search results"})).toBeTruthy();
        const resultsPane = screen.getByRole("list").parentElement as HTMLDivElement;
        Object.defineProperties(resultsPane, {scrollHeight: {value: 200}, clientHeight: {value: 100}, scrollTop: {value: 80}});
        fireEvent.scroll(resultsPane);
        expect(state.loadMore).toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", {name: /Alien/}));
        expect(onSelect).toHaveBeenCalledOnce();
        expect(state.clear).toHaveBeenCalled();
        view.unmount();

        mocks.useMovieSearch.mockReturnValue(searchState({status: "error", error: "Unavailable"}));
        const failedSearch = render(<SearchBar />, {wrapper: MemoryRouter});
        fireEvent.change(screen.getByRole("textbox", {name: "Search movies"}), {target: {value: "alien"}});
        expect(screen.getByRole("alert").textContent).toBe("Unavailable");
        fireEvent.keyDown(screen.getByRole("textbox"), {key: "Escape"});
        expect(mocks.useMovieSearch.mock.results.at(-1)?.value.clear).toHaveBeenCalled();
        fireEvent.pointerDown(document.body);
        failedSearch.unmount();
    });

    it("keeps likes private when signed out and toggles likes for signed-in users", async () => {
        expect(render(<LikeButton tmdbMovieId={550} />).container.innerHTML).toBe("");
        mocks.useAuth.mockReturnValue({token: "session", user: null});
        const toggleLike = vi.fn().mockResolvedValue(undefined);
        mocks.useLikes.mockReturnValue({isLiked: vi.fn().mockReturnValue(false), toggleLike});
        render(<LikeButton tmdbMovieId={550} movieTitle="Fight Club" />);
        const likeButton = screen.getByRole("button", {name: "Like Fight Club"});
        expect(likeButton.getAttribute("aria-pressed")).toBe("false");
        fireEvent.click(likeButton);
        await waitFor(() => expect(toggleLike).toHaveBeenCalledWith(550));
    });

    it("guards follow actions, displays existing state and reports failed changes", async () => {
        const user = {public_id: "friend", username: "Friend"} as never;
        expect(render(<FollowButton user={user} />).container.innerHTML).toBe("");
        mocks.useAuth.mockReturnValue({token: "session", user: {public_id: "me"}});
        const onFollowChange = vi.fn();
        const toggleFollow = vi.fn().mockResolvedValue(undefined);
        mocks.useFollow.mockReturnValue({isFollowing: vi.fn().mockReturnValue(true), toggleFollow});
        const view = render(<FollowButton user={user} onFollowChange={onFollowChange} />);
        const followingButton = screen.getByRole("button", {name: "Unfollow Friend"});
        expect(followingButton.getAttribute("aria-pressed")).toBe("true");
        fireEvent.click(followingButton);
        await waitFor(() => expect(onFollowChange).toHaveBeenCalledOnce());
        expect(toggleFollow).toHaveBeenCalledWith("friend");
        view.unmount();

        mocks.useFollow.mockReturnValue({isFollowing: vi.fn().mockReturnValue(false), toggleFollow: vi.fn().mockRejectedValue(new Error("offline"))});
        render(<FollowButton user={user} />);
        fireEvent.click(screen.getByRole("button", {name: "Follow Friend"}));
        expect((await screen.findByRole("alert")).textContent).toContain("Couldn't update this follow");
    });

    it("renders hero slides, changes active items and advances automatically", async () => {
        const movies = [
            {tmdbId: 1, title: "First film", backdrop_url: "/first.jpg", poster_url: "/first-poster.jpg", tagline: "First"},
            {tmdbId: 2, title: "Second film", backdrop_url: "/second.jpg", poster_url: null, tagline: "Second"},
        ] as never;
        expect(render(<HeroMovieSlider movies={[]} />, {wrapper: MemoryRouter}).container.innerHTML).toBe("");
        const Location = () => <output>{useLocation().pathname}</output>;
        vi.useFakeTimers();
        const view = render(<><HeroMovieSlider movies={movies} interval={1000} /><Location /></>, {wrapper: MemoryRouter});
        expect(screen.getByText("First film")).toBeTruthy();
        expect(screen.getByText("Second film")).toBeTruthy();
        const trailerButtons = screen.getAllByRole("button", {name: /Watch Trailer Now/});
        expect(trailerButtons).toHaveLength(2);
        const slider = view.container.querySelector(".flex.transition-transform") as HTMLDivElement;
        expect(slider.style.transform).toBe("translateX(-0%)");
        const dots = view.container.querySelectorAll("button.w-3");
        fireEvent.click(dots[1]);
        expect(slider.style.transform).toBe("translateX(-100%)");
        fireEvent.click(view.container.querySelector("button.absolute.left-8") as HTMLButtonElement);
        expect(slider.style.transform).toBe("translateX(-0%)");
        await act(async () => vi.advanceTimersByTimeAsync(1000));
        expect(slider.style.transform).toBe("translateX(-100%)");
        fireEvent.click(trailerButtons[0]);
        expect(screen.getByText("/movie/2")).toBeTruthy();
        view.unmount();
        vi.useRealTimers();
    });
});
