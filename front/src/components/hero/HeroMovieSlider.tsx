import { Movie } from "../../types/movie.ts";
import {useEffect, useRef, useState} from "react";
import {FaChevronLeft, FaChevronRight, FaPlay} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {getTmdbImageUrl} from "../../utils/tmdbImageHelper.ts";
import Title from "../ui/Title.tsx";
import Text from "../ui/Text.tsx";


interface HeroSliderProps {
    movies: Movie[];
    interval?: number;
}

export default function HeroMovieSlider({ movies, interval = 5000 }: HeroSliderProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showUI, setShowUI] = useState(true);
    const navigate = useNavigate();
    const sliderRef = useRef<HTMLDivElement>(null);
    const uiTimeoutRef = useRef<number | null>(null);

    const handleTrailerClick = () => {
        navigate(`/movie/${movies[currentIndex].tmdb_id}`);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length);
        resetUITimeout();
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % movies.length);
        resetUITimeout();
    };

    useEffect(() => {
        const slideInterval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % movies.length);
        }, interval);
        return () => clearInterval(slideInterval);
    }, [movies, interval]);

    const resetUITimeout = () => {
        setShowUI(true);
        if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
        uiTimeoutRef.current = setTimeout(() => setShowUI(false), 3000);
    };

    useEffect(() => {
        const handleMouseMove = () => resetUITimeout();

        window.addEventListener("mousemove", handleMouseMove);
        resetUITimeout();

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
        };
    }, []);

    if (movies.length === 0) return null;

    return (
        <div
            ref={sliderRef}
            className="relative w-full h-[500px] md:h-[500px] rounded-2xl overflow-hidden bg-black"
        >
            <div
                className="flex transition-transform duration-700 ease-in-out h-full"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {movies.map((movie) => (
                    <div
                        key={movie.tmdb_id}
                        className="relative min-w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${getTmdbImageUrl(movie.backdrop_url, "original")})` }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-black/70"></div>

                        {movie.poster_url && (
                            <img
                                src={getTmdbImageUrl(movie.poster_url)}
                                alt={movie.title}
                                className="absolute left-8 bottom-8 w-[100px] md:w-[140px] rounded-lg shadow-lg border border-white/10"
                            />
                        )}

                        <div className="relative z-10 h-full flex flex-col justify-end p-8 text-white max-w-[1100px] mx-auto ml-[110px] md:ml-[160px]">
                            <Title
                                title={movie.title}
                                as="h2"
                                className="text-3xl md:text-5xl max-w-full"
                            />
                            <Text text={movie.tagline} size="base" className="mt-2 text-white/80 line-clamp-3 max-w-full"/>
                            <button
                                className="mt-4 flex items-center gap-3 bg-neutral-700 text-white px-3 py-2 rounded hover:bg-purple-800 transition text-sm md:text-lg md:px-6 md:py-3 md:w-[250px]"
                                onClick={handleTrailerClick}
                            >
                                <FaPlay className="text-sm md:text-2xl" />
                                <span className="hidden md:inline">Watch Trailer Now</span>
                                <span className="md:hidden">Trailer</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div
                className={`absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-3 z-20 transition-opacity duration-500 ${
                    showUI ? "opacity-100" : "opacity-0"
                }`}
            >
                {movies.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            setCurrentIndex(index);
                            resetUITimeout();
                        }}
                        className={`w-3 h-3 rounded-full ${
                            index === currentIndex ? "bg-white" : "bg-white/30"
                        }`}
                    />
                ))}
            </div>

            <button
                onClick={handlePrev}
                className={`absolute left-8 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-4 rounded-full z-20 backdrop-blur-sm hidden md:flex transition-opacity duration-500 ${
                    showUI ? "opacity-100" : "opacity-0"
                }`}
            >
                <FaChevronLeft className="text-white text-2xl" />
            </button>

            <button
                onClick={handleNext}
                className={`absolute right-8 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-4 rounded-full z-20 backdrop-blur-sm hidden md:flex transition-opacity duration-500 ${
                    showUI ? "opacity-100" : "opacity-0"
                }`}
            >
                <FaChevronRight className="text-white text-2xl" />
            </button>
        </div>
    );
}