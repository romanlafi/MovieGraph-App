import {useMemo} from "react";
import {getPersonByTmdbId} from "@/services/peopleService.ts";
import {useAsyncResource} from "@/hooks/useAsyncResource.ts";

export function usePersonDetail(tmdbPersonId: number | null) {
    const load = useMemo(() => tmdbPersonId === null ? null
        : (signal: AbortSignal) => getPersonByTmdbId(tmdbPersonId, signal), [tmdbPersonId]);
    const {data, loading, error, retry} = useAsyncResource(load);

    return {person: data, loading, error, retry};
}
