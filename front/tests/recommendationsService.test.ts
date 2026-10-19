import {beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({
    getFollowedMovieLikes: vi.fn(),
    getTmdbCatalogue: vi.fn(),
    getUserLikes: vi.fn(),
}));

vi.mock("@/services/followService.ts", () => ({getFollowedMovieLikes: mocks.getFollowedMovieLikes}));
vi.mock("@/services/movieLikesService.ts", () => ({getUserLikes: mocks.getUserLikes}));
vi.mock("@/services/tmdbService.ts", () => ({getTmdbCatalogue: mocks.getTmdbCatalogue}));

import {getPersonalizedRecommendations} from "@/services/recommendationsService.ts";

const movie = (tmdb_id: number, extras: Record<string, unknown> = {}) => ({
    tmdb_id,
    title: `Movie ${tmdb_id}`,
    poster_path: `/poster-${tmdb_id}.jpg`,
    backdrop_path: `/backdrop-${tmdb_id}.jpg`,
    vote_average: 8,
    ...extras,
});

describe("personalized recommendation ranking", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getUserLikes.mockResolvedValue([550, 550, -1]);
        mocks.getFollowedMovieLikes.mockResolvedValue([550, 680, 680, 155, -2]);
        mocks.getTmdbCatalogue.mockImplementation((path: string) => {
            if (path.endsWith("/recommendations")) {
                if (path.startsWith("movie/550/")) return Promise.resolve([
                    movie(1), movie(2, {vote_average: 7}), movie(550), movie(3, {poster_path: null}), movie(4, {vote_average: 0}),
                ]);
                if (path.startsWith("movie/680/")) return Promise.reject(new Error("partial upstream failure"));
                return Promise.resolve([movie(5)]);
            }
            if (path === "movie/550" || path === "movie/680") return Promise.resolve(movie(Number(path.slice(6)), {
                cast: [
                    {tmdb_id: 9, name: "Alex", profile_path: "/alex.jpg"},
                    {tmdb_id: 10, name: "No photo", profile_path: null},
                ],
            }));
            if (path === "movie/1" || path === "movie/2") return Promise.resolve(movie(Number(path.slice(6))));
            return Promise.resolve(movie(999, {backdrop_path: null}));
        });
    });

    it("deduplicates source IDs, excludes liked films, tolerates failures and enriches ranked rows", async () => {
        const result = await getPersonalizedRecommendations(new AbortController().signal);
        expect(result.basedOnLikes.map(item => item.tmdbId)).toEqual([1, 2]);
        expect(result.fromFriends.map(item => item.tmdbId)).toEqual([5]);
        expect(result.familiarFaces).toMatchObject([{tmdbId: 9, name: "Alex", photo_url: "/alex.jpg"}]);
        expect(result.hero.map(item => item.tmdbId)).toEqual([1, 2]);
        expect(mocks.getTmdbCatalogue).toHaveBeenCalledWith("movie/550/recommendations", undefined, expect.any(AbortSignal));
        expect(mocks.getTmdbCatalogue).toHaveBeenCalledWith("movie/680/recommendations", undefined, expect.any(AbortSignal));
    });

    it("returns empty recommendations when MovieGraph sources fail", async () => {
        mocks.getUserLikes.mockRejectedValueOnce(new Error("likes unavailable"));
        mocks.getFollowedMovieLikes.mockRejectedValueOnce(new Error("friends unavailable"));
        const result = await getPersonalizedRecommendations(new AbortController().signal);
        expect(result).toEqual({hero: [], basedOnLikes: [], familiarFaces: [], fromFriends: []});
        expect(mocks.getTmdbCatalogue).not.toHaveBeenCalled();
    });

    it("ranks a shared recommendation ahead of individually suggested films", async () => {
        mocks.getFollowedMovieLikes.mockResolvedValueOnce([]);
        mocks.getUserLikes.mockResolvedValueOnce([10, 20]);
        mocks.getTmdbCatalogue.mockImplementation((path: string) => {
            if (path.endsWith("/recommendations")) {
                return Promise.resolve(path.startsWith("movie/10/")
                    ? [movie(7), movie(8)]
                    : [movie(8), movie(7)]);
            }
            if (path === "movie/10" || path === "movie/20") return Promise.resolve(movie(Number(path.slice(6)), {cast: []}));
            return Promise.resolve(movie(Number(path.slice(6))));
        });
        const result = await getPersonalizedRecommendations(new AbortController().signal);
        expect(result.basedOnLikes.map(item => item.tmdbId)).toEqual([7, 8]);
    });
});
