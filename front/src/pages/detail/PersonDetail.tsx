import {useParams} from "react-router-dom";
import Container from "@/components/layout/Container.tsx";
import LoadingSpinner from "@/components/ui/LoadingSpinner.tsx";
import ErrorState from "@/components/ui/ErrorState.tsx";
import PersonHeaderCard from "@/components/person/PersonHeaderCard.tsx";
import PersonFilmographySection from "@/components/person/PersonFilmographySection.tsx";
import PersonCollaboratorsSection from "@/components/person/PersonCollaboratorsSection.tsx";
import NotFound from "@/pages/NotFound.tsx";
import {usePersonDetail} from "@/hooks/person/usePersonDetail.ts";
import {parseTmdbId} from "@/utils/parseTmdbId.ts";
import {isNotFoundError} from "@/utils/apiErrors.ts";

export default function PersonDetail() {
    const {tmdbPersonId: tmdbPersonIdParam} = useParams<{tmdbPersonId: string}>();
    const tmdbPersonId = parseTmdbId(tmdbPersonIdParam);
    const {person, loading, error, retry} = usePersonDetail(tmdbPersonId);

    if (tmdbPersonId === null || isNotFoundError(error)) return <NotFound />;
    if (loading) return <LoadingSpinner />;
    if (error) return (
        <Container className="py-10">
            <ErrorState message="Couldn't load this person. Please try again." onRetry={retry} />
        </Container>
    );
    if (!person) return null;

    return (
        <Container className="py-10 text-ink space-y-10">
            <PersonHeaderCard person={person} />
            <PersonFilmographySection tmdbPersonId={person.tmdbId} />
            <PersonCollaboratorsSection tmdbPersonId={person.tmdbId} />
        </Container>
    );
}
