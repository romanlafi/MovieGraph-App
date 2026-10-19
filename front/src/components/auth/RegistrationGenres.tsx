import type {ReactNode} from "react";
import {useAsyncResource} from "@/hooks/useAsyncResource.ts";
import {getGenres} from "@/services/moviesService.ts";
import GenreSelector from "@/components/genre/GenreSelector.tsx";

interface Props {
    selected: string[];
    onToggle: (genre: string) => void;
    error?: string;
    disabled?: boolean;
}

export default function RegistrationGenres({selected, onToggle, error, disabled}: Readonly<Props>) {
    const {data: genres, loading} = useAsyncResource(getGenres);
    let genreContent: ReactNode;
    if (loading) genreContent = <p className="text-sm text-muted">Loading genres…</p>;
    else if (genres?.length) genreContent = <GenreSelector genres={genres} selected={selected} onToggle={onToggle} />;
    else genreContent = <p className="text-sm text-muted">Genres are unavailable. You can set them later.</p>;

    return (
        <fieldset disabled={disabled} aria-invalid={Boolean(error)} aria-describedby="register-genres-feedback" tabIndex={error ? -1 : undefined} className="rounded-lg border border-border bg-card p-4">
            <legend className="px-1 text-sm font-semibold text-ink">Favorite genres</legend>
            {genreContent}
            <p id="register-genres-feedback" className={`mt-2 text-xs ${error ? "text-red-300" : "text-muted"}`}>
                {error ?? "Optional. Select up to 20 favorite genres."}
            </p>
        </fieldset>
    );
}
