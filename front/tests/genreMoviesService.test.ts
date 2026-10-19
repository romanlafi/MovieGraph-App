import {beforeEach, describe, expect, it, vi} from "vitest";

const {getMoviesByTmdbGenreId} = vi.hoisted(() => ({
    getMoviesByTmdbGenreId: vi.fn(),
}));

vi.mock("@/services/moviesService.ts", () => ({getMoviesByTmdbGenreId}));

import {getRandomMoviesForGenre} from "@/services/genreMoviesService.ts";
import type {Movie} from "@/types/movie.ts";

const movie = (tmdbId: number): Movie => ({tmdbId, title: `Movie ${tmdbId}`, poster_url: ""});

describe("getRandomMoviesForGenre", () => {
    beforeEach(() => {
        getMoviesByTmdbGenreId.mockReset();
        vi.stubGlobal("crypto", {
            getRandomValues: (values: Uint32Array) => {
                values[0] = 0;
                return values;
            },
        });
    });

    it("loads up to three pages and returns shuffled movies", async () => {
        getMoviesByTmdbGenreId
            .mockResolvedValueOnce([movie(1), movie(2)])
            .mockResolvedValueOnce([movie(3), movie(4)])
            .mockResolvedValueOnce([movie(5)]);

        const result = await getRandomMoviesForGenre(18, new AbortController().signal);

        expect(getMoviesByTmdbGenreId).toHaveBeenCalledTimes(3);
        expect(getMoviesByTmdbGenreId).toHaveBeenNthCalledWith(1, 18, 1, 20, expect.any(AbortSignal));
        expect(result.movies.map(item => item.tmdbId).sort()).toEqual([1, 2, 3, 4, 5]);
        expect(result.partialError).toBe(false);
    });

    it("returns partial results when a later page fails", async () => {
        getMoviesByTmdbGenreId
            .mockResolvedValueOnce([movie(1)])
            .mockRejectedValueOnce(new Error("TMDB unavailable"));

        const result = await getRandomMoviesForGenre(18, new AbortController().signal);

        expect(result.movies.map(item => item.tmdbId)).toEqual([1]);
        expect(result.partialError).toBe(true);
    });

    it("propagates a failure when no page returned movies", async () => {
        const failure = new Error("TMDB unavailable");
        getMoviesByTmdbGenreId.mockRejectedValueOnce(failure);

        await expect(getRandomMoviesForGenre(18, new AbortController().signal)).rejects.toBe(failure);
    });

    it("propagates errors when the request was aborted", async () => {
        const controller = new AbortController();
        getMoviesByTmdbGenreId
            .mockResolvedValueOnce([movie(1)])
            .mockImplementationOnce(() => {
                controller.abort();
                return Promise.reject(new Error("Aborted"));
            });

        await expect(getRandomMoviesForGenre(18, controller.signal)).rejects.toThrow("Aborted");
    });
});
