import {useEffect, useState} from "react";
import {Movie} from "../../types/movie.ts";
import LoadingSpinner from "../../components/layout/LoadingSpinner.tsx";
import Container from "../../components/layout/Container.tsx";
import {
    getPersonalizedRecommendations,
} from "../../services/recommendationsService.ts";
import HeroMovieSlider from "../../components/hero/HeroMovieSlider.tsx";
import MovieCarousel from "../../components/movie/MovieCarousel.tsx";
import {friendRecommendations, likeRecommendations, peopleRecommendations} from "../../data/carouselCategories.ts";
import {Person} from "../../types/person.ts";
import PersonCarousel from "../../components/person/PersonCarousel.tsx";

export default function RecommendationsPage() {
    const [hero, setHero] = useState<Movie[]>([]);
    const [likeMovies, setLikeMovies] = useState<Movie[]>([]);
    const [people, setPeople] = useState<Person[]>([]);
    const [friends, setFriends] = useState<Movie[]>([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        void getPersonalizedRecommendations(controller.signal).then(recommendations => {
            if (controller.signal.aborted) return;
            setHero(recommendations.hero);
            setLikeMovies(recommendations.basedOnLikes);
            setPeople(recommendations.familiarFaces);
            setFriends(recommendations.fromFriends);
        }).catch(error => {
            if (!controller.signal.aborted) console.error("Failed to fetch recommendations", error);
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });

        return () => controller.abort();
    }, []);

    if (loading) return <LoadingSpinner />;

    return (
        <Container className="space-y-10 mt-10 pb-10">
            {hero.length > 0 &&
                <HeroMovieSlider
                    movies={hero}
                />
            }
            {likeMovies.length > 0 &&
                <MovieCarousel
                    movies={likeMovies}
                    title={likeRecommendations.title}
                    subtitle={likeRecommendations.subtitle}
                    genreLink={false}
                />
            }
            {people.length > 0 &&
                <PersonCarousel
                    people={people}
                    title={peopleRecommendations.title}
                    subtitle={peopleRecommendations.subtitle}
                />
            }
            {friends.length > 0 &&
                <MovieCarousel
                    movies={friends}
                    title={friendRecommendations.title}
                    subtitle={friendRecommendations.subtitle}
                    genreLink={false}
                />
            }
        </Container>
    );
}
