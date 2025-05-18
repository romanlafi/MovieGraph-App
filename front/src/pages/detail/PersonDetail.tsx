import Container from "../../components/layout/Container.tsx";
import {useParams} from "react-router-dom";
import LoadingSpinner from "../../components/layout/LoadingSpinner.tsx";
import NotFound from "../NotFound.tsx";
import MovieCarousel from "../../components/movie/MovieCarousel.tsx";
import PersonHeaderCard from "../../components/person/PersonHeaderCard.tsx";
import PersonCarousel from "../../components/person/PersonCarousel.tsx";
import {actedMovies, directedMovies, relatedPeoplePerson} from "../../data/carouselCategories.ts";
import {usePersonDetail} from "../../hooks/person/usePersonDetail.ts";

export default function PersonDetail() {
    const { id } = useParams<{ id: string }>();
    const { person, acted, directed, relatedPeople, loading } = usePersonDetail(id ?? "");

    if (loading) return <LoadingSpinner />;
    if (!person) return <NotFound />;

    return (
        <Container className="py-10 text-white space-y-10">
            <PersonHeaderCard
                person={person}
            />
            <MovieCarousel
                movies={directed}
                title={directedMovies.title}
                subtitle={directedMovies.subtitle}
                genreLink={false}
            />
            <MovieCarousel
                movies={acted}
                title={actedMovies.title}
                subtitle={actedMovies.subtitle}
                genreLink={false}
            />
            <PersonCarousel
                people={relatedPeople}
                title={relatedPeoplePerson.title}
                subtitle={relatedPeoplePerson.subtitle}
            />
        </Container>
    );
}