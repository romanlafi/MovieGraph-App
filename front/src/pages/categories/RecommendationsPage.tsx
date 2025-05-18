import {useEffect, useState} from "react";
import {Movie} from "../../types/movie.ts";
import LoadingSpinner from "../../components/layout/LoadingSpinner.tsx";
import Container from "../../components/layout/Container.tsx";
import {
    getFriendsRecommendations,
    getHeroRecommendations, getRecommendationsFromLikes,
    getRecommendedPeople
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
        const fetchRecommendations = async () => {
            try {
                const heroRes = await getHeroRecommendations();
                const likeMoviesResp = await getRecommendationsFromLikes();
                const peopleRes = await getRecommendedPeople();
                const friendsRes = await getFriendsRecommendations();

                setHero(heroRes);
                setLikeMovies(likeMoviesResp);
                setPeople(peopleRes);
                setFriends(friendsRes);
            } catch (error) {
                console.error("Failed to fetch recommendations", error);
            } finally {
                setLoading(false);
            }
        };

        void fetchRecommendations();
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