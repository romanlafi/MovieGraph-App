import {Movie} from "../../types/movie.ts";
import {useNavigate} from "react-router-dom";
import Title from "../ui/Title.tsx";
import MovieCarouselOverlay from "./MovieCarouselOverlay.tsx";
import Text from "../ui/Text.tsx";

interface Props {
    movies: Movie[];
    title?: string;
    subtitle?: string;
    genreLink?: boolean;
}

export default function MovieCarousel({ movies, title, subtitle, genreLink = true }: Props) {
    const navigate = useNavigate();

    const handleTitleClick = () => {
        if (genreLink && title) {
            navigate(`/genre/${encodeURIComponent(title)}`);
        }
    };

    if (!movies.length) return null;

    return (
        <section className="bg-neutral-800 rounded-xl p-6 shadow space-y-4">
            <Title
                title={title}
                as="h2"
                size="md"
                className={`mb-2 ${genreLink ? "cursor-pointer hover:text-purple-400" : ""}`}
                onClick={handleTitleClick}
            />
            <Text text={subtitle} className="text-white/70"/>
            <MovieCarouselOverlay movies={movies} />
        </section>
    );
}
