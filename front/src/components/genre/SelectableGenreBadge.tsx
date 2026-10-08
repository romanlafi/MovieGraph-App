interface SelectableGenreBadgeProps {
    genre: string;
    selected: boolean;
    onClick: (genre: string) => void;
}

export default function SelectableGenreBadge({
                                                 genre,
                                                 selected,
                                                 onClick,
                                             }: SelectableGenreBadgeProps) {
    return (
        <button
            type="button"
            onClick={() => onClick(genre)}
            className={`px-2 py-1 rounded-full text-xs transition border ${
                selected
                    ? "bg-accent text-canvas border-accent"
                    : "bg-accent/15 text-accent hover:bg-accent/25 border-transparent"
            }`}
        >
            {genre}
        </button>
    );
}
