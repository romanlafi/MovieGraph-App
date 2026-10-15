import {useAsyncResource} from "./useAsyncResource.ts";
import {getLatestMovies, getRandomCollection, getRandomMovies, getTopRatedMovies} from "@/services/moviesService.ts";
import {getRandomPeople} from "@/services/peopleService.ts";

const loadFeatured = (signal: AbortSignal) => getRandomMovies(5, signal);
const loadLatest = (signal: AbortSignal) => getLatestMovies(1, 10, signal);
const loadTop = (signal: AbortSignal) => getTopRatedMovies(1, 10, signal);

export function useHomeData() {
    const featured = useAsyncResource(loadFeatured);
    const latest = useAsyncResource(loadLatest);
    const people = useAsyncResource(getRandomPeople);
    const collection = useAsyncResource(getRandomCollection);
    const top = useAsyncResource(loadTop);
    const resources = [featured, latest, people, collection, top];

    return {
        featuredMovies: featured.data ?? [],
        latestReleases: latest.data ?? [],
        featuredPeople: people.data ?? [],
        featuredCollection: collection.data,
        topRated: top.data ?? [],
        loading: resources.some(resource => resource.loading),
        error: resources.some(resource => Boolean(resource.error)),
        retry: () => resources.filter(resource => resource.error).forEach(resource => resource.retry()),
    };
}
