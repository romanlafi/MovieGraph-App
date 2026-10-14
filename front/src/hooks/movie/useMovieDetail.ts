import {useMemo} from "react";
import {getMovieByTmdbId} from "../../services/moviesService.ts";
import {useAsyncResource} from "../useAsyncResource.ts";

export function useMovieDetail(tmdbMovieId: number | null) {
    const load = useMemo(() => tmdbMovieId === null ? null
        : (signal: AbortSignal) => getMovieByTmdbId(tmdbMovieId, signal), [tmdbMovieId]);
    const {data, loading, error, retry} = useAsyncResource(load);

    return {movie: data, loading, error, retry};
}
