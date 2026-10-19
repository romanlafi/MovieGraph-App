import {useCallback} from "react";
import {getRelatedPeople} from "@/services/peopleService.ts";
import {useAsyncResource} from "@/hooks/useAsyncResource.ts";
import {relatedPeoplePerson} from "@/data/carouselCategories.ts";
import AsyncSection from "@/components/layout/AsyncSection.tsx";
import PersonCarousel from "./PersonCarousel.tsx";

export default function PersonCollaboratorsSection({tmdbPersonId}: Readonly<{tmdbPersonId: number}>) {
    const load = useCallback((signal: AbortSignal) => getRelatedPeople(tmdbPersonId, signal), [tmdbPersonId]);
    const {data, loading, error, retry} = useAsyncResource(load);

    return (
        <AsyncSection title={relatedPeoplePerson.title} loading={loading} error={Boolean(error)} empty={!data?.length}
            errorMessage="Couldn't load collaborators. Please try again." onRetry={retry}>
            <PersonCarousel people={data ?? []} title={relatedPeoplePerson.title} subtitle={relatedPeoplePerson.subtitle} showRoles={false} />
        </AsyncSection>
    );
}
