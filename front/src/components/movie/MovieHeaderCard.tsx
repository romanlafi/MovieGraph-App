import type {Movie} from "@/types/movie.ts";
import MovieMedia from "./MovieMedia.tsx";
import MovieMetadata from "./MovieMetadata.tsx";

export default function MovieHeaderCard({movie}: Readonly<{movie: Movie}>) {
    return (
        <section className="bg-panel rounded-xl p-6 shadow space-y-4">
            <MovieMedia movie={movie} />
            <MovieMetadata movie={movie} />
        </section>
    );
}
