import {getLatestMovies} from "../../services/moviesService.ts";
import {usePaginatedMovies} from "./usePaginatedMovies.ts";

const PAGE_SIZE = 10;

export function useLatestMovies() {
    return usePaginatedMovies(getLatestMovies, PAGE_SIZE);
}
