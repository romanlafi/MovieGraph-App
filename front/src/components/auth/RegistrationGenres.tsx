import {useAsyncResource} from "@/hooks/useAsyncResource.ts";
import {getGenres} from "@/services/moviesService.ts";
import GenreSelector from "@/components/genre/GenreSelector.tsx";

interface Props {
    selected: string[];
    onToggle: (genre: string) => void;
}

export default function RegistrationGenres({selected, onToggle}: Props) {
    const {data: genres, loading} = useAsyncResource(getGenres);

    return (
        <fieldset className="rounded-lg border border-border bg-card p-4">
            <legend className="px-1 text-sm font-semibold text-ink">Favorite genres</legend>
            {loading ? (
                <p className="text-sm text-muted">Loading genres…</p>
            ) : genres?.length ? (
                <GenreSelector genres={genres} selected={selected} onToggle={onToggle} />
            ) : (
                <p className="text-sm text-muted">Genres are unavailable. You can set them later.</p>
            )}
        </fieldset>
    );
}
