import type { Movie } from "../types/movie.ts";

export interface ReleaseMonthGroup {
    key: string;
    label: string;
    movies: Movie[];
}

export function getMovieReleaseDate(movie: Movie): Date | undefined {
    if (!movie.released) return undefined;
    const date = new Date(`${movie.released.slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

export function groupMoviesByReleaseMonth(movies: Movie[]): ReleaseMonthGroup[] {
    const groups = new Map<string, ReleaseMonthGroup>();

    for (const movie of movies) {
        const date = getMovieReleaseDate(movie);
        const key = date ? `${date.getFullYear()}-${date.getMonth()}` : "undated";
        const label = date
            ? date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
            : "Date to be announced";
        const group = groups.get(key) ?? { key, label, movies: [] };
        group.movies.push(movie);
        groups.set(key, group);
    }

    return [...groups.values()];
}
