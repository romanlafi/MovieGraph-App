import type {Movie} from "@/types/movie.ts";
import {getTmdbImageUrl} from "@/utils/tmdbImageHelper.ts";
import {getYoutubeEmbedUrl} from "@/utils/youtubeHelpers.ts";
import DetailMediaLayout from "@/components/layout/DetailMediaLayout.tsx";

export default function MovieMedia({movie}: Readonly<{movie: Movie}>) {
    const embedUrl = getYoutubeEmbedUrl(movie.trailer_url);

    return (
        <DetailMediaLayout image={
            <img
                src={getTmdbImageUrl(movie.poster_url, "w500")}
                alt={movie.title}
                fetchPriority="high"
                decoding="async"
                className="h-full w-auto rounded"
            />
        }>
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
                        src={getTmdbImageUrl(movie.backdrop_url, "w780")}
                        alt={movie.title}
                        fetchPriority="high"
                        decoding="async"
                        className="h-full w-auto rounded"
                    />
                )}
            </div>
        </DetailMediaLayout>
    );
}
