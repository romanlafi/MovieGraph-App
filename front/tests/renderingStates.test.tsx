import type {ReactElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {MemoryRouter} from "react-router-dom";
import {beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({
    useUserSearch: vi.fn(),
    useAuth: vi.fn(),
    useAsyncResource: vi.fn(),
}));

vi.mock("@/hooks/user/useUserSearch.ts", () => ({useUserSearch: mocks.useUserSearch}));
vi.mock("@/hooks/auth/useAuth.ts", () => ({useAuth: mocks.useAuth}));
vi.mock("@/hooks/useAsyncResource.ts", () => ({useAsyncResource: mocks.useAsyncResource}));

import AsyncSection from "@/components/layout/AsyncSection.tsx";
import CommentSection from "@/components/comment/CommentSection.tsx";
import MovieSearchResults from "@/components/search/MovieSearchResults.tsx";
import RegistrationGenres from "@/components/auth/RegistrationGenres.tsx";
import SocialSessionState from "@/components/user/SocialSessionState.tsx";
import UserNetworkSection from "@/components/user/UserNetworkSection.tsx";
import UserSearchSection from "@/components/user/UserSearchSection.tsx";
import {getMovieSearchStatusMessage} from "@/utils/movieSearchStatus.ts";

const render = (element: ReactElement): string => renderToStaticMarkup(element);

describe("component status messages", () => {
    beforeEach(() => {
        mocks.useAuth.mockReturnValue({token: null, isLoading: false, retrySession: vi.fn()});
    });

    it("reports movie search status only while the dropdown is visible", () => {
        expect(getMovieSearchStatusMessage(true, "success", 0)).toBe("No movies found.");
        expect(getMovieSearchStatusMessage(true, "success", 2)).toBe("2 movies found.");
        expect(getMovieSearchStatusMessage(true, "loading", 0)).toBe("Searching movies...");
        expect(getMovieSearchStatusMessage(false, "success", 0)).toBe("");
        expect(getMovieSearchStatusMessage(true, "error", 0)).toBe("");
    });

    it("shows the appropriate pagination retry when loading more fails", () => {
        const html = render(
            <MovieSearchResults
                results={[{tmdbId: 1, title: "Alien", rating: 8, year: 1979, poster_url: null}]}
                loading={false}
                error={null}
                loadingMore={false}
                hasMore
                loadMoreError="Could not load more."
                onSelect={vi.fn()}
                onRetry={vi.fn()}
                onRetryMore={vi.fn()}
            />,
        );

        expect(html).toContain("Could not load more. Try again.");
    });

    it("renders the no-results message for people search", () => {
        mocks.useUserSearch.mockReturnValue({
            query: "cinefan",
            results: [],
            searchedQuery: "cinefan",
            searching: false,
            searchError: "",
            updateQuery: vi.fn(),
            search: vi.fn(),
        });

        expect(render(<UserSearchSection onFollowChange={vi.fn()} />))
            .toContain("No people found for “cinefan”. Try another username or email.");
    });

    it("shows the anonymous social prompt when no session exists", () => {
        mocks.useAuth.mockReturnValue({token: null, isLoading: false, retrySession: vi.fn()});

        const html = render(<MemoryRouter><SocialSessionState /></MemoryRouter>);

        expect(html).toContain("Your movie circle starts here");
        expect(html).toContain("Sign in from the header");
        expect(html).toContain("<output");
    });

    it("keeps comment counts hidden while loading", () => {
        const html = render(
            <CommentSection comments={[]} onSubmit={vi.fn()} loading error={null} onRetry={vi.fn()} />,
        );

        expect(html).toContain("Loading comments...");
        expect(html).toContain("<output");
        expect(html).toContain("—");
    });

    it("shows loading state for an empty async section", () => {
        const html = render(
            <AsyncSection title="Trending" loading error={false} empty errorMessage="Unavailable" onRetry={vi.fn()}>
                <p>Loaded content</p>
            </AsyncSection>,
        );

        expect(html).toContain("Loading...");
        expect(html).toContain("<output");
        expect(html).not.toContain("Loaded content");
    });

    it("shows the fallback when registration genres are unavailable", () => {
        mocks.useAsyncResource.mockReturnValue({data: null, loading: false});

        expect(render(<RegistrationGenres selected={[]} onToggle={vi.fn()} />))
            .toContain("Genres are unavailable. You can set them later.");
    });

    it("shows the empty state for an unpopulated network", () => {
        const network = {
            followers: [],
            following: [],
            loading: false,
            error: null,
            refresh: vi.fn(),
        } as never;

        const html = render(<UserNetworkSection network={network} />);
        expect(html).toContain("No follows yet");
        expect(html).toContain("<fieldset");
        expect(html).toContain("<legend");
    });
});
