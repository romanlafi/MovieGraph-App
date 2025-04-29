import { FaFilm, FaSignInAlt, FaThumbsUp } from "react-icons/fa";
import { useState } from "react";
import { Link } from "react-router-dom";
import LoginForm from "../auth/LoginForm.tsx";
import {useAuth} from "../../contexts/AuthContext.tsx";
import UserMenu from "../auth/UserMenu.tsx";


export default function Header() {
    const { token } = useAuth();
    const [showLogin, setShowLogin] = useState(false);

    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-purple-800 border-b border-neutral-800 z-50 shadow-md">
            <div className="max-w-[1100px] mx-auto h-full flex items-center justify-between px-4 sm:px-6 md:px-8 relative">

                {/* Logo MovieGraph */}
                <Link to="/" className="flex items-center gap-2 text-lg font-bold text-white">
                    <FaFilm className="text-xl" />
                    <span className="hidden sm:inline">MovieGraph</span>
                </Link>

                {/* Navegación */}
                <nav className="flex items-center gap-6 text-sm text-white relative">

                    <a href="#" className="flex items-center gap-2 hover:text-black transition">
                        <FaThumbsUp />
                        <span className="hidden sm:inline">Recommendations</span>
                    </a>

                    {token ? (
                        <UserMenu />
                    ) : (
                        <>
                            <button
                                onClick={() => setShowLogin((prev) => !prev)}
                                className="flex items-center gap-2 hover:text-black transition relative"
                            >
                                <FaSignInAlt />
                                <span className="hidden sm:inline">Login</span>
                            </button>

                            {showLogin && (
                                <div className="absolute top-16 right-0 mt-2 w-64 bg-neutral-800 rounded shadow-lg p-4 z-50">
                                    <LoginForm onSuccess={() => setShowLogin(false)} />
                                </div>
                            )}
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}
