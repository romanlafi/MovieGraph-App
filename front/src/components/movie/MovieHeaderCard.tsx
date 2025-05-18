import { Movie } from "../../types/movie";
import {
    FaCalendarAlt,
    FaClock,
    FaCoins, FaGlobe
} from "react-icons/fa";
import GenreBadge from "../genre/GenreBadge.tsx";
import RatingDisplay from "../common/RatingDisplay.tsx";
import CountryFlag from "../common/CountryFlag.tsx";
import {parseCountryCodes} from "../../utils/parseCountryCodes.ts";
import {formatCurrency} from "../../utils/formatters.ts";
import {getTmdbImageUrl} from "../../utils/tmdbImageHelper.ts";
import {getYoutubeEmbedUrl} from "../../utils/youtubeHelpers.ts";
import Title from "../ui/Title.tsx";
import Text from "../ui/Text.tsx";


export default function MovieHeaderCard({ movie }: { movie: Movie }) {
    const embedUrl = getYoutubeEmbedUrl(movie.trailer_url);
    const countries = parseCountryCodes(movie.origin_country);

    if (!movie) return null;

    return (
        <section className="bg-neutral-800 rounded-xl p-6 shadow space-y-4">
            <div className="flex flex-col lg:flex-row gap-6 justify-center items-start mt-2">
                <div className="w-full max-w-xs mx-auto lg:mx-0 h-[420px] flex items-center justify-center rounded overflow-hidden">
                    <img
                        src={getTmdbImageUrl(movie.poster_url, "original")}
                        alt={movie.title}
                        className="h-full w-auto rounded"
                    />
                </div>

                <div className="w-full md:h-[420px] flex items-center justify-center overflow-hidden rounded shadow">
                    {embedUrl ? (
                        <iframe
                            src={embedUrl}
                            title="Trailer"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full aspect-video md:aspect-auto h-full rounded"
                        />
                    ) : (
                        <img
                            src={getTmdbImageUrl(movie.backdrop_url, "original")}
                            alt={movie.title}
                            className="h-full w-auto rounded"
                        />
                    )}
                </div>
            </div>


            <div className="space-y-4 text-white">
                <Title title={movie.title} as="h1" size="lg"/>

                <div className="flex flex-wrap gap-4 text-sm text-white/80">
                    <span className="flex items-center gap-2"><FaCalendarAlt className="text-purple-400" />{movie.year}</span>
                    <span className="flex items-center gap-2"><FaClock className="text-purple-400" />{movie.runtime}</span>
                    {movie.box_office && <span className="flex items-center gap-2"><FaCoins className="text-purple-400"/>{formatCurrency(movie.box_office)}</span>}
                    {movie.website && <a className="flex items-center gap-2" href={movie.website} target="_blank"><FaGlobe className="text-purple-400"/>Website</a>}
                </div>

                {countries.length > 0 && (
                    <span className="flex items-center gap-2">
                            {countries.map((cc) => (
                                <CountryFlag key={cc} code={cc} />
                            ))}
                        </span>
                )}

                {movie.rating && <RatingDisplay rating={movie.rating} className="mt-2" iconSize={14}/>}

                <div className="flex flex-wrap gap-2 ">
                    {movie.genres?.map((genre) => (
                        <GenreBadge key={genre} genre={genre} />
                    ))}
                </div>

                <Text text={movie.plot} size="base" className="text-white/70 leading-relaxed" />
            </div>
        </section>
    );
}