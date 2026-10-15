import {useMemo} from "react";
import {getLatestMovies} from "@/services/moviesService.ts";
import {groupMoviesByReleaseMonth} from "@/utils/releaseCalendar.ts";
import {usePaginatedMovies} from "./usePaginatedMovies.ts";

const PAGE_SIZE = 10;

export function useLatestMovies() {
    const pagination = usePaginatedMovies(getLatestMovies, PAGE_SIZE);
    const groups = useMemo(() => groupMoviesByReleaseMonth(pagination.movies), [pagination.movies]);

    return {...pagination, groups};
}
