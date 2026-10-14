import {useEffect, useState} from "react";
import {getPersonalizedRecommendations} from "../../services/recommendationsService.ts";
import type {PersonalizedRecommendations} from "../../services/recommendationsService.ts";

export function usePersonalizedRecommendations() {
    const [recommendations, setRecommendations] = useState<PersonalizedRecommendations>({
        hero: [],
        basedOnLikes: [],
        familiarFaces: [],
        fromFriends: [],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        void getPersonalizedRecommendations(controller.signal)
            .then(results => {
                if (!controller.signal.aborted) setRecommendations(results);
            })
            .catch(error => {
                if (!controller.signal.aborted) console.error("Failed to fetch recommendations", error);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, []);

    return {...recommendations, loading};
}
