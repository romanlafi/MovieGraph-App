import {useEffect, useRef, useState} from "react";
import {Movie} from "../../types/movie.ts";
import {searchTmdbMovies} from "../../services/moviesService.ts";
import {useNavigate} from "react-router-dom";
import TextInput from "../common/TextInput.tsx";

export default function SearchBar() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Movie[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        const timeout = setTimeout(async () => {
            try {
                const res = await searchTmdbMovies(query);
                setResults(res);
                setShowDropdown(true);
            } catch (err) {
                console.error("Error searching movies", err);
            }
        }, 300); // debounce

        return () => clearTimeout(timeout);
    }, [query]);

    const handleSelect = (tmdb_id: number) => {
        navigate(`/movie/${tmdb_id}`);
        setShowDropdown(false);
        setQuery("");
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!dropdownRef.current?.contains(e.target as Node)) {
                setShowDropdown(false);
                setQuery("");
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    return (
        <div className="relative flex-1 mx-4 md:flex" ref={dropdownRef}>
            <TextInput
                type="text"
                placeholder="Search movies..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />

            {showDropdown && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-neutral-800 border border-neutral-700 mt-1 rounded shadow-lg z-50 max-h-72 overflow-y-auto">
                    {results.map((movie) => (
                        <button
                            key={movie.tmdb_id}
                            onClick={() => handleSelect(movie.tmdb_id)}
                            className="flex items-center w-full text-left gap-3 p-2 hover:bg-neutral-700 transition"
                        >
                            <img
                                src={movie.poster_url}
                                alt={movie.title}
                                className="w-9 h-13 object-cover rounded"
                            />
                            <div className="text-sm text-white flex-1 overflow-hidden">
                                <p className="font-semibold truncate">{movie.title}</p>
                                <div className="flex items-center justify-between text-xs text-white/60">
                                    <span>{movie.year}</span>
                                    {movie.rating && (
                                        <span className="text-yellow-400 font-medium">
                                            ★ {movie.rating.toPrecision(3)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}