import HeroMovieSlider from "../components/hero/HeroMovieSlider.tsx";
import MovieCarousel from "../components/movie/MovieCarousel.tsx";
import HeroCollection from "../components/hero/HeroCollection.tsx";
import PersonCarousel from "../components/person/PersonCarousel.tsx";

import LoadingSpinner from "../components/layout/LoadingSpinner.tsx";
import Container from "../components/layout/Container.tsx";

import {useHomeData} from "../hooks/useHomeData.ts";

import {explorePeople, latestMovies, topMovies} from "../data/carouselCategories.ts";


export default function Home() {
    const {
        randomFeaturedMovies,
        latestReleases,
        topRated,
        featuredCollection,
        featuredPeople,
        loading,
    } = useHomeData();

    if (loading) return <LoadingSpinner />;

    return (
        <Container className="space-y-10 pb-10 mt-10">
            <HeroMovieSlider movies={randomFeaturedMovies} />

            <MovieCarousel
                movies={latestReleases}
                title={latestMovies.title}
                subtitle={latestMovies.subtitle}
                genreLink={false}
            />

            <PersonCarousel
                people={featuredPeople}
                title={explorePeople.title}
                subtitle={explorePeople.subtitle}
            />

            {featuredCollection?.movies && (
                <HeroCollection
                    collection={featuredCollection}
                    movies={featuredCollection.movies}
                />
            )}

            <MovieCarousel
                movies={topRated}
                title={topMovies.title}
                subtitle={topMovies.subtitle}
                genreLink={false}
            />
        </Container>
    );
}
