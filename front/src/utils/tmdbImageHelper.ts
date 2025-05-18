export type TmdbImageSize =
    | "w92"
    | "w154"
    | "w185"
    | "w342"
    | "w500"
    | "w780"
    | "original";

export function getTmdbImageUrl(
    path: string | null | undefined,
    size: TmdbImageSize = "w500",
): string | undefined {
    if (!path) return undefined;
    return `https://image.tmdb.org/t/p/${size}${path}`;
}