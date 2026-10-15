import LoadingSpinner from "../../components/layout/LoadingSpinner.tsx";
import Container from "../../components/layout/Container.tsx";
import {usePersonalizedRecommendations} from "../../hooks/movie/usePersonalizedRecommendations.ts";
import HeroMovieSlider from "../../components/hero/HeroMovieSlider.tsx";
import MovieCarousel from "../../components/movie/MovieCarousel.tsx";
import {friendRecommendations, likeRecommendations, peopleRecommendations} from "../../data/carouselCategories.ts";
import PersonCarousel from "../../components/person/PersonCarousel.tsx";

export default function RecommendationsPage() {
    const {hero, basedOnLikes, familiarFaces, fromFriends, loading} = usePersonalizedRecommendations();

    if (loading) return <LoadingSpinner />;

    return (
        <Container className="space-y-10 mt-10 pb-10">
            {hero.length > 0 &&
                <HeroMovieSlider
                    movies={hero}
                />
            }
            {basedOnLikes.length > 0 &&
                <MovieCarousel
                    movies={basedOnLikes}
                    title={likeRecommendations.title}
                    subtitle={likeRecommendations.subtitle}
                    genreLink={false}
                />
            }
            {familiarFaces.length > 0 &&
                <PersonCarousel
                    people={familiarFaces}
                    title={peopleRecommendations.title}
                    subtitle={peopleRecommendations.subtitle}
                    showRoles={false}
                />
            }
            {fromFriends.length > 0 &&
                <MovieCarousel
                    movies={fromFriends}
                    title={friendRecommendations.title}
                    subtitle={friendRecommendations.subtitle}
                    genreLink={false}
                />
            }
        </Container>
    );
}
