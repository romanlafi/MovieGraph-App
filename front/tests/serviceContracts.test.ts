import {beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({
    defaults: {baseURL: "https://moviegraph.example/api/v1"},
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
}));

vi.mock("@/services/api.ts", () => ({api: mocks}));

import {registerUser, loginUser, fetchUser} from "@/services/authService.ts";
import {getCommentsByMovie, postComment} from "@/services/commentService.ts";
import {
    followUser, getFollowedMovieLikes, getMyFollowers, getMyFollowing, getUserByEmail,
    getUserByPublicId, searchUsers, unfollowUser,
} from "@/services/followService.ts";
import {getUserLikes, likeMovie, unlikeMovie} from "@/services/movieLikesService.ts";
import {
    getCollections, getGenres, getLatestMovies, getMovieByTmdbId, getMoviesByCollection,
    getMoviesByTmdbGenreId, getRandomCollection, getRandomMovies, getRelatedMovies, getTopRatedMovies,
} from "@/services/moviesService.ts";
import {getPersonByTmdbId, getPersonFilmography, getRandomPeople, getRelatedPeople} from "@/services/peopleService.ts";
import {searchTmdbMovies} from "@/services/tmdbService.ts";

const catalogueMovie = {
    tmdb_id: 550,
    title: "Fight Club",
    poster_path: "/poster.jpg",
    vote_average: 8.4,
    release_date: "1999-10-15",
};

describe("frontend API services", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.get.mockResolvedValue({data: []});
        mocks.post.mockResolvedValue({data: {}});
        mocks.delete.mockResolvedValue({data: {}});
    });

    it("sends auth requests with the expected payloads and returns their data", async () => {
        mocks.post.mockResolvedValueOnce({data: {id: 1}}).mockResolvedValueOnce({data: {access_token: "jwt"}});
        mocks.get.mockResolvedValueOnce({data: {id: 1, username: "cinefan"}});
        const registration = {username: "cinefan", email: "cinefan@example.test", password: "secret"};
        const signal = new AbortController().signal;

        await expect(registerUser(registration as never)).resolves.toEqual({id: 1});
        await expect(loginUser("cinefan@example.test", "secret")).resolves.toBe("jwt");
        await expect(fetchUser("jwt", signal)).resolves.toMatchObject({username: "cinefan"});
        expect(mocks.post.mock.calls[1][1].toString()).toContain("username=cinefan%40example.test");
        expect(mocks.get).toHaveBeenCalledWith("/users/me", expect.objectContaining({signal, timeout: 15000}));
    });

    it("uses TMDB movie identifiers for comment and like requests", async () => {
        mocks.get.mockResolvedValueOnce({data: [{id: 3}]}).mockResolvedValueOnce({data: [550]});
        mocks.post.mockResolvedValueOnce({data: {id: 4, tmdb_movie_id: 550}}).mockResolvedValueOnce({data: true});

        await expect(getCommentsByMovie(550)).resolves.toEqual([{id: 3}]);
        await expect(postComment(550, "Great film")).resolves.toMatchObject({tmdb_movie_id: 550});
        await expect(getUserLikes()).resolves.toEqual([550]);
        await expect(likeMovie(550)).resolves.toBe(true);
        await unlikeMovie(550);
        expect(mocks.get).toHaveBeenNthCalledWith(1, "/movies/550/comments", {signal: undefined});
        expect(mocks.post).toHaveBeenCalledWith("/movies/550/comments", {text: "Great film"});
        expect(mocks.delete).toHaveBeenCalledWith("/movies/550/like");
    });

    it("covers follow lookups, actions and optional request signals", async () => {
        const signal = new AbortController().signal;
        mocks.get.mockResolvedValue({data: [{public_id: "friend"}]});
        await expect(searchUsers("friend", signal)).resolves.toHaveLength(1);
        await getMyFollowing(signal);
        await getMyFollowers(signal);
        await getFollowedMovieLikes(signal);
        await getUserByEmail("friend@example.test", signal);
        await getUserByPublicId("friend/one", signal);
        await followUser("friend");
        await unfollowUser("friend");

        expect(mocks.get).toHaveBeenCalledWith("/follows/search", {params: {query: "friend"}, signal});
        expect(mocks.get).toHaveBeenCalledWith("/follows/following", {signal});
        expect(mocks.get).toHaveBeenCalledWith("/follows/followers", {signal});
        expect(mocks.get).toHaveBeenCalledWith("/follows/movie-likes", {signal});
        expect(mocks.get).toHaveBeenCalledWith("/follows/by_email", {params: {email: "friend@example.test"}, signal});
        expect(mocks.get).toHaveBeenCalledWith("/follows/users/friend%2Fone", {signal});
        expect(mocks.post).toHaveBeenCalledWith("/follows/", {public_id: "friend"});
        expect(mocks.delete).toHaveBeenCalledWith("/follows/", {data: {public_id: "friend"}});
    });

    it("maps catalogue movie lists, details, genres and collections", async () => {
        mocks.get.mockResolvedValue({data: [catalogueMovie]});
        await expect(getMoviesByTmdbGenreId(18)).resolves.toMatchObject([{tmdbId: 550, title: "Fight Club"}]);
        mocks.get.mockResolvedValueOnce({data: {movies: [catalogueMovie]}});
        await expect(getMoviesByCollection(1)).resolves.toMatchObject([{tmdbId: 550}]);
        await expect(getTopRatedMovies()).resolves.toHaveLength(1);
        await expect(getLatestMovies()).resolves.toHaveLength(1);
        await expect(getRelatedMovies(550)).resolves.toHaveLength(1);
        mocks.get.mockResolvedValueOnce({data: catalogueMovie});
        await expect(getMovieByTmdbId(550)).resolves.toMatchObject({runtime: undefined, year: "1999"});
        mocks.get.mockResolvedValueOnce({data: [{tmdb_id: 18, name: "Drama"}]});
        await expect(getGenres()).resolves.toEqual([{tmdbId: 18, name: "Drama"}]);
        mocks.get.mockResolvedValueOnce({data: [{tmdb_id: 1, name: "Collection", movies: [catalogueMovie]}]});
        await expect(getCollections()).resolves.toMatchObject([{tmdbId: 1, movies: [{tmdbId: 550}]}]);
        await expect(getRandomMovies(3)).resolves.toHaveLength(1);
        await expect(getRandomCollection()).resolves.toMatchObject({tmdbId: 550});
        expect(mocks.get).toHaveBeenCalledWith("/api/tmdb/movies", expect.objectContaining({
            baseURL: "https://moviegraph.example", params: {kind: "genre", tmdb_genre_id: 18, page: 1, limit: 10},
        }));
    });

    it("maps people, filmographies and only searchable movies with images and ratings", async () => {
        mocks.get.mockResolvedValueOnce({data: {tmdb_id: 287, name: "Brad Pitt", profile_path: "/brad.jpg"}});
        await expect(getPersonByTmdbId(287)).resolves.toMatchObject({tmdbId: 287, name: "Brad Pitt"});
        mocks.get.mockResolvedValueOnce({data: {acted: [catalogueMovie], directed: []}});
        await expect(getPersonFilmography(287)).resolves.toMatchObject({acted: [{tmdbId: 550}], directed: []});
        mocks.get.mockResolvedValueOnce({data: [{tmdb_id: 287, name: "Brad Pitt"}]});
        await expect(getRelatedPeople(287)).resolves.toMatchObject([{tmdbId: 287}]);
        mocks.get.mockResolvedValueOnce({data: [{tmdb_id: 287, name: "Brad Pitt"}]});
        await expect(getRandomPeople()).resolves.toHaveLength(1);
        mocks.get.mockResolvedValueOnce({data: {
            results: [
                {tmdb_id: 550, title: "Fight Club", poster_url: "/poster.jpg", rating: 8.4, year: 1999},
                {tmdb_id: 1, title: "No poster", poster_url: null, rating: 8, year: 2000},
            ], page: 1, total_pages: 2,
        }});
        await expect(searchTmdbMovies("fight", 2)).resolves.toEqual({
            results: [{tmdbId: 550, title: "Fight Club", poster_url: "/poster.jpg", rating: 8.4, year: 1999}],
            page: 1,
            totalPages: 2,
        });
        expect(mocks.get).toHaveBeenLastCalledWith("/api/tmdb/search/movie", expect.objectContaining({params: {q: "fight", page: 2}}));
    });
});
