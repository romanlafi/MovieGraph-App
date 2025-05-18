import {Collection} from "../../types/collection.ts";
import {Movie} from "../../types/movie.ts";
import MovieCarouselOverlay from "../movie/MovieCarouselOverlay.tsx";
import RatingDisplay from "../common/RatingDisplay.tsx";
import {getAverageRating} from "../../utils/ratingHelpers.ts";
import {getTmdbImageUrl} from "../../utils/tmdbImageHelper.ts";
import Title from "../ui/Title.tsx";

interface HeroCollectionProps {
    collection: Collection;
    movies: Movie[];
}

export default function HeroCollection({ collection, movies }: HeroCollectionProps) {
    const avgRating = getAverageRating(movies);

    return (
        <div className="relative w-full h-[550px] md:h-[600px] rounded-2xl overflow-hidden bg-black mb-8">
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${getTmdbImageUrl(collection.backdrop_url, "original")})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/80"></div>
            </div>

            <div className="relative z-10 h-full flex flex-col justify-between p-8 text-white max-w-[1200px] mx-auto">
                <div className="flex items-end gap-6">
                    {collection.poster_url && (
                        <img
                            src={getTmdbImageUrl(collection.poster_url)}
                            alt={collection.name}
                            className="w-[100px] md:w-[160px] rounded-lg shadow-lg border border-white/10"
                        />
                    )}
                    <div>
                        <Title title={collection.name} as="h2" className="text-4xl md:text-5xl"/>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            {avgRating && (
                                <RatingDisplay
                                    rating={avgRating}
                                    className="ml-4 text-sm"
                                    iconSize={14}
                                />
                            )}

                            <span className="text-white/70 ml-4 text-sm">
                                {movies.length} {movies.length === 1 ? "movie" : "movies"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <MovieCarouselOverlay movies={movies} />
                </div>
            </div>
        </div>
    );
}