import {Genre} from "../../types/genre.ts";
import SelectableGenreBadge from "./SelectableGenreBadge.tsx";

interface GenreSelectorProps {
    genres: Genre[];
    selected: string[];
    onToggle: (genre: string) => void;
    label?: string;
}

export default function GenreSelector({
                                          genres,
                                          selected,
                                          onToggle,
                                          label,
                                      }: GenreSelectorProps) {
    return (
        <div className="space-y-1">
            {label && <p className="mb-2 block font-bold text-ink">{label}</p>}
            <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                    <SelectableGenreBadge
                        key={genre.id}
                        genre={genre.name}
                        selected={selected.includes(genre.name)}
                        onClick={onToggle}
                    />
                ))}
            </div>
        </div>
    );
}
