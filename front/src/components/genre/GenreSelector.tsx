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
                                          label = "Favorite Genres:",
                                      }: GenreSelectorProps) {
    return (
        <div className="space-y-1">
            <label className="block text-white font-bold mb-2">{label}</label>
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