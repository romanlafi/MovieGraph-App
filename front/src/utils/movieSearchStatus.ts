export type MovieSearchStatus = "idle" | "loading" | "success" | "error";

export function getMovieSearchStatusMessage(
    isDropdownVisible: boolean,
    status: MovieSearchStatus,
    resultCount: number,
): string {
    if (!isDropdownVisible) return "";
    if (status === "loading") return "Searching movies...";
    if (status !== "success") return "";
    return resultCount ? `${resultCount} movies found.` : "No movies found.";
}
