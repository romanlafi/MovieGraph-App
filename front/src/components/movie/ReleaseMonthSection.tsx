import type { ReleaseMonthGroup } from "../../utils/releaseCalendar.ts";
import MovieReleaseCard from "./MovieReleaseCard.tsx";

interface ReleaseMonthSectionProps {
    group: ReleaseMonthGroup;
}

export default function ReleaseMonthSection({ group }: ReleaseMonthSectionProps) {
    return (
        <section className="grid min-w-0 gap-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8">
            <h2 className="flex items-center gap-3 self-start border-b border-border pb-3 text-lg font-semibold capitalize text-ink sm:sticky sm:top-20 sm:z-10 sm:block sm:border-b-0 sm:border-r sm:bg-canvas sm:pb-0">
                <span className="h-2 w-2 rounded-full bg-accent sm:hidden" />
                <span className="sm:pr-6">{group.label}</span>
            </h2>
            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                {group.movies.map((movie) => (
                    <MovieReleaseCard key={movie.tmdb_id} movie={movie} />
                ))}
            </div>
        </section>
    );
}
