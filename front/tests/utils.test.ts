import {describe, expect, it} from "vitest";
import {getAverageRating} from "@/utils/ratingHelpers.ts";
import {formatCurrency} from "@/utils/formatters.ts";
import {parseCountryCodes} from "@/utils/parseCountryCodes.ts";
import {parseTmdbId} from "@/utils/parseTmdbId.ts";
import {getTmdbImageUrl} from "@/utils/tmdbImageHelper.ts";
import {getYoutubeEmbedUrl} from "@/utils/youtubeHelpers.ts";
import {getMovieReleaseDate, groupMoviesByReleaseMonth} from "@/utils/releaseCalendar.ts";
import {isNotFoundError} from "@/utils/apiErrors.ts";
import type {Movie} from "@/types/movie.ts";

const movie = (tmdbId: number, options: Partial<Movie> = {}): Movie => ({
    tmdbId,
    title: `Movie ${tmdbId}`,
    poster_url: "",
    ...options,
});

describe("TMDB identifiers", () => {
    it("accepts positive safe integer IDs only", () => {
        expect(parseTmdbId("550")).toBe(550);
        for (const invalid of [undefined, "", "0", "-1", "1.5", " 550", "9007199254740992"]) {
            expect(parseTmdbId(invalid)).toBeNull();
        }
    });
});

describe("API errors", () => {
    it("recognizes Axios 404 responses only", () => {
        expect(isNotFoundError({isAxiosError: true, response: {status: 404}})).toBe(true);
        expect(isNotFoundError({isAxiosError: true, response: {status: 500}})).toBe(false);
        expect(isNotFoundError(new Error("missing"))).toBe(false);
    });
});

describe("movie utility formatting", () => {
    it("parses country code strings and preserves supplied arrays", () => {
        expect(parseCountryCodes("US, GB, ,CA")).toEqual(["US", "GB", "CA"]);
        expect(parseCountryCodes(undefined)).toEqual([]);
        const codes = ["US", "GB"];
        expect(parseCountryCodes(codes)).toBe(codes);
    });

    it("formats USD without fractional digits", () => {
        expect(formatCurrency(1234.56)).toBe("$1,235");
        expect(formatCurrency(0)).toBe("$0");
    });

    it("builds TMDB image URLs with default and requested sizes", () => {
        expect(getTmdbImageUrl("/poster.jpg")).toBe("https://image.tmdb.org/t/p/w500/poster.jpg");
        expect(getTmdbImageUrl("/backdrop.jpg", "w1280")).toBe("https://image.tmdb.org/t/p/w1280/backdrop.jpg");
        expect(getTmdbImageUrl(null)).toBeUndefined();
    });

    it("builds YouTube embed URLs and handles missing IDs", () => {
        expect(getYoutubeEmbedUrl("abc123")).toBe("https://www.youtube.com/embed/abc123?autoplay=1&mute=1&rel=0&showinfo=0");
        expect(getYoutubeEmbedUrl("abc123", false)).toContain("autoplay=0");
        expect(getYoutubeEmbedUrl(undefined)).toBe("");
    });

    it("averages numeric ratings and returns null when none are available", () => {
        expect(getAverageRating([movie(1), movie(2, {rating: 7}), movie(3, {rating: 9})])).toBe(8);
        expect(getAverageRating([movie(1), movie(2, {rating: undefined})])).toBeNull();
    });
});

describe("release calendar", () => {
    it("parses release dates and groups dated and undated movies", () => {
        const january = movie(1, {released: "2025-01-12T00:00:00Z"});
        const sameMonth = movie(2, {released: "2025-01-26"});
        const february = movie(3, {released: "2025-02-02"});
        const undated = movie(4);

        expect(getMovieReleaseDate(january)).toBeInstanceOf(Date);
        expect(getMovieReleaseDate(undated)).toBeUndefined();
        expect(getMovieReleaseDate(movie(5, {released: "not-a-date"}))).toBeUndefined();

        const groups = groupMoviesByReleaseMonth([january, sameMonth, february, undated]);
        expect(groups.map(group => group.key)).toEqual(["2025-0", "2025-1", "undated"]);
        expect(groups[0].movies).toEqual([january, sameMonth]);
        expect(groups[2].label).toBe("Date to be announced");
    });
});
