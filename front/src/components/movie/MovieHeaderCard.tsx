import { Movie } from "../../types/movie";
import {
    FaCalendarAlt,
    FaClock,
    FaCoins, FaGlobe
} from "react-icons/fa";
import GenreBadge from "../genre/GenreBadge.tsx";
import RatingDisplay from "../common/RatingDisplay.tsx";

function toEmbedUrl(url?: string): string | null {
    if (!url) return null;
    const match = url.match(/(?:\?v=|\/embed\/|\.be\/)([\w-]{11})/);
    const videoId = match?.[1];
    return videoId
        ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&showinfo=0`
        : null;
}

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);
};

export default function MovieHeaderCard({ movie }: { movie: Movie }) {
    const embedUrl = toEmbedUrl(movie.trailer_url);

    return (
        <section className="bg-neutral-800 rounded-xl p-6 shadow space-y-4">
            <div className="flex flex-col lg:flex-row gap-6 justify-center items-start mt-2">
                <div className="w-full max-w-xs mx-auto lg:mx-0 h-[420px] flex items-center justify-center rounded overflow-hidden">
                    <img
                        src={movie.poster_url}
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
                        <div className="flex items-center justify-center w-full h-full bg-neutral-800 text-white/50 text-sm">
                            Trailer not available
                        </div>
                    )}
                </div>
            </div>


            <div className="space-y-4 text-white">
                <h1 className="text-3xl font-bold">{movie.title}</h1>

                <div className="flex flex-wrap gap-4 text-sm text-white/80">
                    <span className="flex items-center gap-2"><FaCalendarAlt className="text-purple-400" />{movie.year}</span>
                    <span className="flex items-center gap-2"><FaClock className="text-purple-400" />{movie.runtime}</span>
                    {movie.box_office && <span className="flex items-center gap-2"><FaCoins className="text-purple-400"/>{formatCurrency(movie.box_office)}</span>}
                    <a className="flex items-center gap-2" href={movie.website}  target="_blank"><FaGlobe className="text-purple-400" />Website</a>
                </div>

                {movie.rating && <RatingDisplay rating={movie.rating} className="mt-2" iconSize={14}/>}

                <div className="flex flex-wrap gap-2 ">
                    {movie.genres?.map((genre) => (
                        <GenreBadge key={genre} genre={genre} />
                    ))}
                </div>

                <p className="text-white/70 leading-relaxed">
                    {movie.plot || "Plot not available"}
                </p>
            </div>
        </section>
    );
}