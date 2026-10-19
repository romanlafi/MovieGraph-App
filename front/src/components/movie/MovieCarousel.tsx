import type {Movie} from "@/types/movie.ts";
import {Link} from "react-router-dom";
import Title from "@/components/ui/Title.tsx";
import MovieCarouselOverlay from "./MovieCarouselOverlay.tsx";
import Text from "@/components/ui/Text.tsx";

interface Props {
    movies: Movie[];
    title?: string;
    subtitle?: string;
    genreLink?: boolean;
}

export default function MovieCarousel({ movies, title, subtitle, genreLink = true }: Readonly<Props>) {
    if (!movies.length) return null;

    return (
        <section className="bg-panel rounded-xl p-6 shadow space-y-4">
            <Title as="h2" size="md" className="mb-2">
                {genreLink && title ? (
                    <Link to={`/genre/${encodeURIComponent(title)}`} className="hover:text-accent focus-visible:outline-2 focus-visible:outline-accent">
                        {title}
                    </Link>
                ) : title}
            </Title>
            <Text text={subtitle} className="text-ink/70"/>
            <MovieCarouselOverlay movies={movies} />
        </section>
    );
}
