import {FaSignInAlt, FaThumbsUp, FaUserCircle} from "react-icons/fa";
import {useEffect, useRef, useState} from "react";
import { Link } from "react-router-dom";
import LoginForm from "../auth/LoginForm.tsx";
import {useAuth} from "../../contexts/AuthContext.tsx";
import SearchBarWrapper from "../search/SearchBarWrapper.tsx";
import SearchBar from "../search/SearchBar.tsx";
import NavItem from "../common/NavItem.tsx";


export default function Header() {
    const { token, user } = useAuth();
    const [showLogin, setShowLogin] = useState(false);
    const loginRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (loginRef.current && !loginRef.current.contains(event.target as Node)) {
                setShowLogin(false);
            }
        }

        if (showLogin) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showLogin]);

    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-purple-800 border-b border-neutral-800 z-50 shadow-md">
            <div className="max-w-[1100px] mx-auto h-full flex items-center justify-between px-4 sm:px-6 md:px-8 relative">

                <Link to="/" className="flex items-center gap-2 text-lg font-bold text-white hover:text-black transition-colors">
                    <img src="/public/logo_white.svg" alt="Logo" className="w-6 h-6" />
                    <span className="sm:inline">MovieGraph</span>
                </Link>

                <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-full max-w-md">
                    <SearchBar />
                </div>

                {/* Right: Nav icons + search (mobile) */}
                <nav className="flex items-center gap-4 text-sm text-white relative">
                    <div className="md:hidden">
                        <SearchBarWrapper />
                    </div>

                    <NavItem to="#">
                        <FaThumbsUp className="text-xl" />
                        <span className="hidden sm:inline">Recommendations</span>
                    </NavItem>

                    {token && user ? (
                        <NavItem to="/user/profile">
                            <FaUserCircle className="text-xl" />
                            <span className="hidden sm:inline">{user.username}</span>
                        </NavItem>
                    ) : (
                        <>
                            <NavItem onClick={() => setShowLogin((prev) => !prev)}>
                                <FaSignInAlt className="text-xl" />
                                <span className="hidden sm:inline">Login</span>
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