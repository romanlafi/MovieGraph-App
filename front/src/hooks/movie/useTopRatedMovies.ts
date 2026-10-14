import {getTopRatedMovies} from "../../services/moviesService.ts";
import {usePaginatedMovies} from "./usePaginatedMovies.ts";

const PAGE_SIZE = 10;

export function useTopRatedMovies() {
    return usePaginatedMovies(getTopRatedMovies, PAGE_SIZE);
}
