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
                    ? "bg-purple-600 text-white border-purple-400"
                    : "bg-purple-800/40 text-purple-300 hover:bg-purple-700 border-transparent"
            }`}
        >
            {genre}
        </button>
    );
}