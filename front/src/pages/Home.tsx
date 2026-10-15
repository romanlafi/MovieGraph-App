import Container from "@/components/layout/Container.tsx";
import LoadingSpinner from "@/components/ui/LoadingSpinner.tsx";
import ErrorState from "@/components/ui/ErrorState.tsx";
import HeroMovieSlider from "@/components/hero/HeroMovieSlider.tsx";
import HeroCollection from "@/components/hero/HeroCollection.tsx";
import MovieCarousel from "@/components/movie/MovieCarousel.tsx";
import PersonCarousel from "@/components/person/PersonCarousel.tsx";
import {explorePeople, latestMovies, topMovies} from "@/data/carouselCategories.ts";
import {useHomeData} from "@/hooks/useHomeData.ts";

export default function Home() {
    const {featuredMovies, latestReleases, featuredPeople, featuredCollection, topRated, loading, error, retry} = useHomeData();

    if (loading) return <LoadingSpinner />;

    return (
        <Container className="space-y-10 pb-10 mt-10">
            {error && <ErrorState message="Some sections couldn't be loaded. Please try again." onRetry={retry} />}
            <HeroMovieSlider movies={featuredMovies} />
            <MovieCarousel movies={latestReleases} title={latestMovies.title} subtitle={latestMovies.subtitle} genreLink={false} />
            <PersonCarousel people={featuredPeople} title={explorePeople.title} subtitle={explorePeople.subtitle} />
            {featuredCollection?.movies && <HeroCollection collection={featuredCollection} movies={featuredCollection.movies} />}
            <MovieCarousel movies={topRated} title={topMovies.title} subtitle={topMovies.subtitle} genreLink={false} />
        </Container>
    );
}
