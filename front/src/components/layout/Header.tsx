import {FaBars, FaSignInAlt, FaUser, FaUsers} from "react-icons/fa";
import {useEffect, useRef, useState} from "react";
import { Link } from "react-router-dom";
import LoginForm from "../auth/LoginForm.tsx";
import SearchBarWrapper from "../search/SearchBarWrapper.tsx";
import SearchBar from "../search/SearchBar.tsx";
import NavItem from "../common/NavItem.tsx";
import {useAuth} from "../../hooks/auth/useAuth.ts";
import CategoryOverlay from "./CategoryOverlay.tsx";


export default function Header() {
    const { token, user } = useAuth();
    const [showCategories, setShowCategories] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const loginRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (loginRef.current && !loginRef.current.contains(event.target as Node)) {
                setShowLogin(false);
            }
        };

        if (showLogin) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showLogin]);

    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-purple-800 border-b border-neutral-800 z-50 shadow-md">
            <div className="max-w-[1100px] mx-auto h-full flex items-center justify-between px-4 sm:px-6 md:px-8 relative">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 text-lg font-bold text-white">
                    <img src="/logo_bold.svg" alt="Logo" className="w-6 h-6" />
                    <span className="sm:inline">MovieGraph</span>
                </Link>

                {/* Search desktop */}
                <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-full max-w-md">
                    <SearchBar />
                </div>

                {/* Right side nav */}
                <nav className="flex items-center gap-1 text-sm text-white relative">
                    {/* Search mobile */}
                    <div className="md:hidden">
                        <SearchBarWrapper />
                    </div>

                    <NavItem onClick={() => setShowCategories(true)}>
                        <div className="flex items-center gap-2">
                            <FaBars className="text-xl" />
                            <span className="hidden md:inline">Menu</span>
                        </div>
                    </NavItem>

                    <CategoryOverlay open={showCategories} onClose={() => setShowCategories(false)} />

                    {token && (
                        <NavItem to="/social">
                            <div className="flex items-center gap-2">
                                <FaUsers className="text-2xl" />
                                <span className="hidden md:inline">Social</span>
                            </div>
                        </NavItem>
                    )}

                    {token && user ? (
                        <NavItem to={`/user/${user.email}`}>
                            <div className="flex items-center gap-2">
                                <FaUser className="text-xl" />
                                <span className="hidden md:inline">{user.username}</span>
                            </div>
                        </NavItem>
                    ) : (
                        <>
                            <NavItem onClick={() => setShowLogin((prev) => !prev)}>
                                <div className="flex items-center gap-2">
                                    <FaSignInAlt className="text-xl" />
                                    <span className="hidden md:inline">Login</span>
                                </div>
                            </NavItem>

                            {showLogin && (
                                <div
                                    ref={loginRef}
                                    className="absolute right-4 top-10 z-50 w-72 bg-neutral-800 rounded shadow-lg p-4"
                                >
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