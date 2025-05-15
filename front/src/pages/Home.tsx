import Container from "../components/common/Container.tsx";
import HeroSlider from "../components/hero/HeroSlider.tsx";
import {Movie} from "../types/movie.ts";
import MovieCarousel from "../components/movie/MovieCarousel.tsx";
import {useEffect, useState} from "react";
import {getRandomMovies} from "../services/moviesService.ts";

export default function Home() {

    const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                const movies = await getRandomMovies(5);
                console.log(movies);
                setFeaturedMovies(movies);
            } catch (error) {
                console.error("Failed to load movies:", error);
            }
        };
        void fetchMovies();
    }, []);

    return (
        <Container className="space-y-10 pb-10 mt-10">
            <HeroSlider movies={featuredMovies} />
            <MovieCarousel movies={featuredMovies} title="Placeholder" subtitle="Placeholder" />
        </Container>
    );
}
