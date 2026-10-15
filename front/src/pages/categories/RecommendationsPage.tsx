import LoadingSpinner from "@/components/ui/LoadingSpinner.tsx";
import ErrorState from "@/components/ui/ErrorState.tsx";
import Container from "@/components/layout/Container.tsx";
import HeroMovieSlider from "@/components/hero/HeroMovieSlider.tsx";
import MovieCarousel from "@/components/movie/MovieCarousel.tsx";
import PersonCarousel from "@/components/person/PersonCarousel.tsx";
import {friendRecommendations, likeRecommendations, peopleRecommendations} from "@/data/carouselCategories.ts";
import {usePersonalizedRecommendations} from "@/hooks/movie/usePersonalizedRecommendations.ts";

export default function RecommendationsPage() {
    const {hero, basedOnLikes, familiarFaces, fromFriends, loading, error, retry} = usePersonalizedRecommendations();

    if (loading) return <LoadingSpinner />;

    return (
        <Container className="space-y-10 mt-10 pb-10">
            {error && <ErrorState message={error} onRetry={retry} />}
            <HeroMovieSlider movies={hero} />
            <MovieCarousel movies={basedOnLikes} title={likeRecommendations.title} subtitle={likeRecommendations.subtitle} genreLink={false} />
            <PersonCarousel people={familiarFaces} title={peopleRecommendations.title} subtitle={peopleRecommendations.subtitle} showRoles={false} />
            <MovieCarousel movies={fromFriends} title={friendRecommendations.title} subtitle={friendRecommendations.subtitle} genreLink={false} />
        </Container>
    );
}
