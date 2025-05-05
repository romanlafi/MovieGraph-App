import {useEffect, useRef, useState} from "react";
import {FaSearch} from "react-icons/fa";
import SearchBar from "./SearchBar.tsx";

export default function SearchBarWrapper() {
    const [showSearch, setShowSearch] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (showSearch) setShowSearch(false);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [showSearch]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSearch(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            {/* Desktop view */}
            <div className="hidden md:flex">
                <SearchBar />
            </div>

            {/* Mobile view */}
            <div className="flex md:hidden items-center justify-end">
                <button
                    onClick={() => setShowSearch(!showSearch)}
                    className="text-white text-xl p-2"
                >
                    <FaSearch />
                </button>
            </div>

            {/* Mobile dropdown search */}
            {showSearch && (
                <div className="fixed top-16 left-1/2 transform -translate-x-1/2 w-[90%] max-w-md z-50 md:hidden">
                    <SearchBar />
                </div>
            )}
        </div>
    );
}