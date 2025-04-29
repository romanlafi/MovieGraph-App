import { Link } from "react-router-dom";

export default function GenreBadge({ genre }: { genre: string }) {
    return (
        <Link
            to={`/genre/${genre}`}
            className="bg-purple-800/40 px-2 py-1 rounded-full text-xs text-purple-300 hover:bg-purple-700 transition"
        >
            {genre}
        </Link>
    );
}