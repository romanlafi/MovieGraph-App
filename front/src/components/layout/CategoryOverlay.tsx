import {
    FaCalendarAlt,
    FaFilm,
    FaFolderOpen,
    FaHome,
    FaStar,
    FaTimes,
    FaTrophy
} from "react-icons/fa";
import {Link} from "react-router-dom";
import {useEffect} from "react";
import {useAuth} from "../../hooks/auth/useAuth.ts";
import Title from "../ui/Title.tsx";

export default function CategoryOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { user }  = useAuth();
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    return (
        <div
            className={`fixed top-0 left-0 w-full h-full bg-panel z-50 transition-transform duration-300 ${
                open ? "translate-y-0" : "-translate-y-full"
            }`}
        >
            <div className="flex justify-between items-center py-6 px-6 text-ink border-b border-white/20 max-w-screen-md mx-auto">
                <Title title="Categories" as="h2" />
                <button
                    onClick={onClose}
                    className="bg-card rounded-full p-2 hover:bg-border transition-colors duration-200"
                >
                    <FaTimes className="text-accent text-xl" />
                </button>
            </div>

            <nav className="flex flex-col gap-8 pt-12 pb-10 px-6 text-ink text-xl font-medium max-w-screen-md mx-auto">
                <Link
                    to="/"
                    onClick={onClose}
                    className="flex items-center gap-3 hover:text-accent hover:scale-105 transition-all duration-200"
                >
                    <FaHome /> Home
                </Link>
                <Link
                    to="/genres"
                    onClick={onClose}
                    className="flex items-center gap-3 hover:text-accent hover:scale-105 transition-all duration-200"
                >
                    <FaFilm /> Genres
                </Link>
                <Link
                    to="/collections"
                    onClick={onClose}
                    className="flex items-center gap-3 hover:text-accent hover:scale-105 transition-all duration-200"
                >
                    <FaFolderOpen /> Collections
                </Link>
                { user &&
                    <Link
                        to="/recommendations"
                        onClick={onClose}
                        className="flex items-center gap-3 hover:text-accent hover:scale-105 transition-all duration-200"
                    >
                        <FaStar/> Recommended for You
                    </Link>
                }
                <Link
                    to="/top-rated"
                    onClick={onClose}
                    className="flex items-center gap-3 hover:text-accent hover:scale-105 transition-all duration-200"
                >
                    <FaTrophy /> Top Rated
                </Link>
                <Link
                    to="/latest"
                    onClick={onClose}
                    className="flex items-center gap-3 hover:text-accent hover:scale-105 transition-all duration-200"
                >
                    <FaCalendarAlt /> Latest Releases
                </Link>
            </nav>
        </div>
    );
}
