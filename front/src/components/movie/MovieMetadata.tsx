import type {Movie} from "../../types/movie.ts";
import GenreBadge from "../genre/GenreBadge.tsx";
import RatingDisplay from "../ui/RatingDisplay.tsx";
import LikeButton from "./LikeButton.tsx";
import Title from "../ui/Title.tsx";
import Text from "../ui/Text.tsx";
import MovieFacts from "./MovieFacts.tsx";

export default function MovieMetadata({movie}: {movie: Movie}) {
    return (
        <div className="space-y-4 text-ink">
            <Title title={movie.title} as="h1" size="lg"/>
            <MovieFacts movie={movie} />
            <div className="flex flex-wrap items-center gap-4">
                {movie.rating && <RatingDisplay rating={movie.rating} iconSize={14}/>}
                <LikeButton tmdbMovieId={movie.tmdbId} movieTitle={movie.title} className="p-1 text-lg text-ink/80" />
            </div>
            <div className="flex flex-wrap gap-2 ">
                {movie.genres?.map(genre => <GenreBadge key={genre} genre={genre} />)}
            </div>
            <Text text={movie.plot} size="base" className="text-ink/70 leading-relaxed" />
        </div>
    );
}
