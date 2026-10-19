import {renderToStaticMarkup} from "react-dom/server";
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({
    useAuth: vi.fn(),
    useCollections: vi.fn(),
    useExploreGenres: vi.fn(),
    useHomeData: vi.fn(),
    useLatestMovies: vi.fn(),
    useMoviesByGenre: vi.fn(),
    useMovieDetail: vi.fn(),
    usePaginatedMovies: vi.fn(),
    usePersonDetail: vi.fn(),
    usePersonalizedRecommendations: vi.fn(),
    useUserNetwork: vi.fn(),
    useUserProfile: vi.fn(),
}));

vi.mock("@/hooks/useHomeData.ts", () => ({useHomeData: mocks.useHomeData}));
vi.mock("@/hooks/collection/useCollections.ts", () => ({useCollections: mocks.useCollections}));
vi.mock("@/hooks/movie/useLatestMovies.ts", () => ({useLatestMovies: mocks.useLatestMovies}));
vi.mock("@/hooks/movie/usePersonalizedRecommendations.ts", () => ({usePersonalizedRecommendations: mocks.usePersonalizedRecommendations}));
vi.mock("@/hooks/movie/usePaginatedMovies.ts", () => ({usePaginatedMovies: mocks.usePaginatedMovies}));
vi.mock("@/hooks/movie/useMovieDetail.ts", () => ({useMovieDetail: mocks.useMovieDetail}));
vi.mock("@/hooks/person/usePersonDetail.ts", () => ({usePersonDetail: mocks.usePersonDetail}));
vi.mock("@/hooks/genre/useExploreGenres.ts", () => ({useExploreGenres: mocks.useExploreGenres}));
vi.mock("@/hooks/genre/useMoviesByGenre.ts", () => ({useMoviesByGenre: mocks.useMoviesByGenre}));
vi.mock("@/hooks/auth/useAuth.ts", () => ({useAuth: mocks.useAuth}));
vi.mock("@/hooks/user/useUserNetwork.ts", () => ({useUserNetwork: mocks.useUserNetwork}));
vi.mock("@/hooks/user/useUserProfile.ts", () => ({useUserProfile: mocks.useUserProfile}));

vi.mock("@/components/hero/HeroMovieSlider.tsx", () => ({default: () => <div>Hero movies</div>}));
vi.mock("@/components/hero/HeroCollection.tsx", () => ({default: () => <div>Hero collection</div>}));
vi.mock("@/components/movie/MovieCarousel.tsx", () => ({default: ({title}: {title: string}) => <div>{title}</div>}));
vi.mock("@/components/person/PersonCarousel.tsx", () => ({default: ({title}: {title: string}) => <div>{title}</div>}));
vi.mock("@/components/movie/ReleaseMonthSection.tsx", () => ({default: () => <div>Release month</div>}));
vi.mock("@/components/movie/MovieRanking.tsx", () => ({default: () => <div>Movie ranking</div>}));
vi.mock("@/components/movie/MovieHeaderCard.tsx", () => ({default: () => <div>Movie header</div>}));
vi.mock("@/components/movie/MovieCastSection.tsx", () => ({default: () => <div>Movie cast</div>}));
vi.mock("@/components/movie/MovieCollectionSection.tsx", () => ({default: () => <div>Movie collection</div>}));
vi.mock("@/components/movie/MovieRelatedSection.tsx", () => ({default: () => <div>Related movies</div>}));
vi.mock("@/components/comment/MovieCommentsSection.tsx", () => ({default: () => <div>Movie comments</div>}));
vi.mock("@/components/person/PersonHeaderCard.tsx", () => ({default: () => <div>Person header</div>}));
vi.mock("@/components/person/PersonFilmographySection.tsx", () => ({default: () => <div>Person filmography</div>}));
vi.mock("@/components/person/PersonCollaboratorsSection.tsx", () => ({default: () => <div>Person collaborators</div>}));
vi.mock("@/components/genre/GenreMoviesSection.tsx", () => ({default: () => <div>Genre movies</div>}));
vi.mock("@/components/movie/MovieGrid.tsx", () => ({default: () => <div>Movie grid</div>}));
vi.mock("@/components/user/SocialSessionState.tsx", () => ({default: () => <div>Sign in to connect</div>}));
vi.mock("@/components/user/UserSearchSection.tsx", () => ({default: () => <div>User search</div>}));
vi.mock("@/components/user/UserNetworkSection.tsx", () => ({default: () => <div>User network</div>}));
vi.mock("@/components/user/UserProfileCard.tsx", () => ({default: () => <div>User profile</div>}));
vi.mock("@/components/user/ProfileNetworkSection.tsx", () => ({default: () => <div>Profile network</div>}));

import Home from "@/pages/Home.tsx";
import CollectionsPage from "@/pages/categories/CollectionsPage.tsx";
import LatestReleasesPage from "@/pages/categories/LatestReleasesPage.tsx";
import RecommendationsPage from "@/pages/categories/RecommendationsPage.tsx";
import TopRatedPage from "@/pages/categories/TopRatedPage.tsx";
import MovieDetail from "@/pages/detail/MovieDetail.tsx";
import PersonDetail from "@/pages/detail/PersonDetail.tsx";
import ExploreGenresPage from "@/pages/genre/ExploreGenresPage.tsx";
import GenrePage from "@/pages/genre/GenrePage.tsx";
import SocialPage from "@/pages/social/SocialPage.tsx";
import UserPage from "@/pages/social/UserPage.tsx";

const render = (element: React.ReactElement) => renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
const renderRoute = (path: string, element: React.ReactElement) => renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
        <Routes>
            <Route path="/movie/:tmdbMovieId" element={element} />
            <Route path="/person/:tmdbPersonId" element={element} />
            <Route path="/user/:publicId" element={element} />
            <Route path="/genre/:genre" element={element} />
        </Routes>
    </MemoryRouter>,
);

describe("application page states", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.useHomeData.mockReturnValue({featuredMovies: [], latestReleases: [], featuredPeople: [], featuredCollection: null, topRated: [], loading: false, error: false, retry: vi.fn()});
        mocks.useCollections.mockReturnValue({visibleCollections: [], loading: false, error: null, hasMore: false, loadMore: vi.fn(), retry: vi.fn()});
        mocks.useLatestMovies.mockReturnValue({groups: [], loading: false, loadMore: vi.fn(), loadingMore: false, hasMore: false, error: null});
        mocks.usePersonalizedRecommendations.mockReturnValue({hero: [], basedOnLikes: [], familiarFaces: [], fromFriends: [], loading: false, error: null, retry: vi.fn()});
        mocks.usePaginatedMovies.mockReturnValue({movies: [], loading: false, loadMore: vi.fn(), loadingMore: false, hasMore: false, error: null});
        mocks.useMovieDetail.mockReturnValue({movie: null, loading: false, error: null, retry: vi.fn()});
        mocks.usePersonDetail.mockReturnValue({person: null, loading: false, error: null, retry: vi.fn()});
        mocks.useExploreGenres.mockReturnValue({visibleGenres: [], loading: false, error: null, retry: vi.fn(), loadMoreGenres: vi.fn(), loadingMore: false, hasMoreGenres: false, setGenreLoading: vi.fn()});
        mocks.useMoviesByGenre.mockReturnValue({movies: [], loading: false, loadMore: vi.fn(), loadingMore: false, hasMore: false, error: null});
        mocks.useAuth.mockReturnValue({token: null, user: null});
        mocks.useUserNetwork.mockReturnValue({followers: [], following: [], loading: false, error: null, refresh: vi.fn()});
        mocks.useUserProfile.mockReturnValue({profile: null, loading: false, error: null, notFound: false, retry: vi.fn(), isCurrentUser: false, logout: vi.fn()});
    });

    it("renders home loading, error and optional collection states", () => {
        mocks.useHomeData.mockReturnValueOnce({loading: true});
        expect(render(<Home />)).toContain("animate-spin");
        mocks.useHomeData.mockReturnValueOnce({featuredMovies: [], latestReleases: [], featuredPeople: [], featuredCollection: {movies: []}, topRated: [], loading: false, error: true, retry: vi.fn()});
        expect(render(<Home />)).toContain("Some sections couldn&#x27;t be loaded");
        expect(mocks.useHomeData).toHaveBeenCalledTimes(2);
    });

    it("renders collection empty, loading, error and pagination states", () => {
        mocks.useCollections.mockReturnValueOnce({loading: true});
        expect(render(<CollectionsPage />)).toContain("animate-spin");
        mocks.useCollections.mockReturnValueOnce({visibleCollections: [], loading: false, error: null, hasMore: false, loadMore: vi.fn(), retry: vi.fn()});
        expect(render(<CollectionsPage />)).toContain("No collections are available");
        mocks.useCollections.mockReturnValueOnce({visibleCollections: [], loading: false, error: "Offline", hasMore: true, loadMore: vi.fn(), retry: vi.fn()});
        const errorMarkup = render(<CollectionsPage />);
        expect(errorMarkup).toContain("Offline");
        expect(errorMarkup).toContain("Load More Collections");
    });

    it("renders release, recommendation and top-rated loading and content", () => {
        mocks.useLatestMovies.mockReturnValueOnce({loading: true});
        expect(render(<LatestReleasesPage />)).toContain("animate-spin");
        expect(render(<LatestReleasesPage />)).not.toContain("Release month");
        mocks.usePersonalizedRecommendations.mockReturnValueOnce({loading: true});
        expect(render(<RecommendationsPage />)).toContain("animate-spin");
        expect(render(<RecommendationsPage />)).toContain("Hero movies");
        mocks.usePaginatedMovies.mockReturnValueOnce({movies: [], loading: true});
        expect(render(<TopRatedPage />)).toContain("animate-spin");
        mocks.usePaginatedMovies.mockReturnValueOnce({movies: [], loading: false, loadMore: vi.fn(), loadingMore: false, hasMore: false, error: null});
        expect(render(<TopRatedPage />)).toContain("No top-rated movies are available");
        mocks.usePaginatedMovies.mockReturnValueOnce({movies: [{tmdbId: 1}], loading: false, loadMore: vi.fn(), loadingMore: false, hasMore: true, error: null});
        expect(render(<TopRatedPage />)).toContain("Movie ranking");
    });

    it("handles movie and person route validation, loading, errors, absence and results", () => {
        mocks.useMovieDetail.mockReturnValueOnce({movie: null, loading: true, error: null, retry: vi.fn()});
        expect(renderRoute("/movie/550", <MovieDetail />)).toContain("animate-spin");
        mocks.useMovieDetail.mockReturnValueOnce({movie: null, loading: false, error: new Error("offline"), retry: vi.fn()});
        expect(renderRoute("/movie/550", <MovieDetail />)).toContain("Couldn&#x27;t load this movie");
        mocks.useMovieDetail.mockReturnValueOnce({movie: null, loading: false, error: null, retry: vi.fn()});
        expect(renderRoute("/movie/550", <MovieDetail />)).toBe("");
        mocks.useMovieDetail.mockReturnValueOnce({movie: {tmdbId: 550, cast: [], collection: {tmdbId: 1}}, loading: false, error: null, retry: vi.fn()});
        expect(renderRoute("/movie/550", <MovieDetail />)).toContain("Movie comments");
        expect(renderRoute("/movie/not-a-number", <MovieDetail />)).toContain("Page not found");

        mocks.usePersonDetail.mockReturnValueOnce({person: null, loading: true, error: null, retry: vi.fn()});
        expect(renderRoute("/person/287", <PersonDetail />)).toContain("animate-spin");
        mocks.usePersonDetail.mockReturnValueOnce({person: null, loading: false, error: new Error("offline"), retry: vi.fn()});
        expect(renderRoute("/person/287", <PersonDetail />)).toContain("Couldn&#x27;t load this person");
        mocks.usePersonDetail.mockReturnValueOnce({person: {tmdbId: 287}, loading: false, error: null, retry: vi.fn()});
        expect(renderRoute("/person/287", <PersonDetail />)).toContain("Person collaborators");
    });

    it("handles genre, social and profile page branches", () => {
        mocks.useExploreGenres.mockReturnValueOnce({loading: true});
        expect(render(<ExploreGenresPage />)).toContain("animate-spin");
        expect(render(<ExploreGenresPage />)).toContain("No genres are available");
        mocks.useExploreGenres.mockReturnValueOnce({visibleGenres: [], loading: false, error: "Offline", retry: vi.fn(), loadMoreGenres: vi.fn(), loadingMore: false, hasMoreGenres: true, setGenreLoading: vi.fn()});
        const genreErrorMarkup = render(<ExploreGenresPage />);
        expect(genreErrorMarkup).toContain("Couldn&#x27;t load genres");
        expect(genreErrorMarkup).toContain("Load More Genres");
        mocks.useMoviesByGenre.mockReturnValueOnce({movies: [], loading: true});
        expect(renderRoute("/genre/drama", <GenrePage />)).toContain("animate-spin");
        expect(renderRoute("/genre/drama", <GenrePage />)).toContain("No movies found for this genre");
        mocks.useMoviesByGenre.mockReturnValueOnce({movies: [{tmdbId: 1}], loading: false, loadMore: vi.fn(), loadingMore: false, hasMore: false, error: "Offline"});
        expect(renderRoute("/genre/drama", <GenrePage />)).toContain("Movie grid");

        expect(render(<SocialPage />)).toContain("Sign in to connect");
        mocks.useAuth.mockReturnValueOnce({token: "token", user: {id: 1}});
        expect(render(<SocialPage />)).toContain("User search");
        mocks.useUserProfile.mockReturnValueOnce({notFound: true});
        expect(renderRoute("/user/missing", <UserPage />)).toContain("Page not found");
        mocks.useUserProfile.mockReturnValueOnce({profile: null, loading: true, notFound: false});
        expect(renderRoute("/user/cinefan", <UserPage />)).toContain("Loading profile");
        mocks.useUserProfile.mockReturnValueOnce({profile: null, loading: false, error: "Offline", notFound: false, retry: vi.fn()});
        expect(renderRoute("/user/cinefan", <UserPage />)).toContain("Profile unavailable");
        mocks.useUserProfile.mockReturnValueOnce({profile: {username: "cinefan"}, loading: false, error: null, notFound: false, isCurrentUser: true, logout: vi.fn()});
        expect(renderRoute("/user/cinefan", <UserPage />)).toContain("Profile network");
    });
});
