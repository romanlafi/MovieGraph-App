import { Link } from "react-router-dom";

export default function GenreBadge({ genre }: { genre: string }) {
    return (
        <Link
            to={`/genre/${genre}`}
            className="bg-accent/15 px-2 py-1 rounded-full text-xs text-accent hover:bg-accent/25 transition"
        >
            {genre}
        </Link>
    );
}
