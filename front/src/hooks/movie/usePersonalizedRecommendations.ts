import {getPersonalizedRecommendations} from "../../services/recommendationsService.ts";
import {useAsyncResource} from "../useAsyncResource.ts";

export function usePersonalizedRecommendations() {
    const {data, loading, error, retry} = useAsyncResource(getPersonalizedRecommendations);

    return {
        hero: data?.hero ?? [],
        basedOnLikes: data?.basedOnLikes ?? [],
        familiarFaces: data?.familiarFaces ?? [],
        fromFriends: data?.fromFriends ?? [],
        loading,
        error: error ? "Couldn't load recommendations. Please try again." : "",
        retry,
    };
}
