import {FaTimes} from "react-icons/fa";
import {Link} from "react-router-dom";
import {useEffect} from "react";

export default function CategoryOverlay({ open, onClose }: { open: boolean, onClose: () => void }) {

    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    return (
        <div className={`fixed top-0 left-0 w-full h-full bg-purple-800 z-50 transition-transform duration-300 ${open ? 'translate-y-0' : '-translate-y-full'}`}>
            <div className="flex justify-between items-center p-4 text-white">
                <h2 className="text-2xl font-bold">Categories</h2>
                <button onClick={onClose}>
                    <FaTimes className="text-2xl" />
                </button>
            </div>

            <nav className="flex flex-col gap-4 p-8 text-xl text-white overflow-y-auto h-[calc(100%-4rem)]">
                <Link to="/genres" onClick={onClose}>Genres</Link>
                <Link to="/recommendations" onClick={onClose}>Recommended for You</Link>
                <Link to="/top-rated" onClick={onClose}>Top Rated</Link>
                <Link to="/latest" onClick={onClose}>Latest Releases</Link>
            </nav>
        </div>
    );
}