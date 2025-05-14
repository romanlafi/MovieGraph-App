import Container from "../components/common/Container.tsx";
import HeroSlider from "../components/hero/HeroSlider.tsx";
import {Movie} from "../types/movie.ts";
import MovieCarousel from "../components/movie/MovieCarousel.tsx";

export default function Home() {

    const featuredMovies: Movie[] = [
        {
            id: "1",
            tmdb_id: 1271,
            title: "300",
            plot: "New model. Original parts.",
            backdrop_url: "https://image.tmdb.org/t/p/original/eGhjeUbzttA3E4flxdAm8gHz4h4.jpg",
            poster_url: "https://image.tmdb.org/t/p/w500/h7Lcio0c9ohxPhSZg42eTlKIVVY.jpg",
            rating: 9.289
        },
        {
            id: "2",
            tmdb_id: 209112,
            title: "Batman vs. Superman",
            plot: "Watch the new trailer for 'F1: The Movie', a thrilling journey through the world of Formula 1 racing.",
            backdrop_url: "https://image.tmdb.org/t/p/original/5fX1oSGuYdKgwWmUTAN5MNSQGzr.jpg",
            poster_url: "https://image.tmdb.org/t/p/w500/5UsK3grJvtQrtzEgqNlDljJW96w.jpg",
            rating: 7.189
        }
    ];

    return (
        <Container className="space-y-10 pb-10 mt-10">
            <HeroSlider movies={featuredMovies} />
            <MovieCarousel movies={featuredMovies} />
        </Container>
    );
}
