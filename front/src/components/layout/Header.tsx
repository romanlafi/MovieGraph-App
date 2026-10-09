import {FaBars, FaRedo, FaSearch, FaSignInAlt, FaSpinner, FaTimes, FaUser, FaUsers} from "react-icons/fa";
import {useEffect, useRef, useState} from "react";
import {Link, useLocation} from "react-router-dom";
import LoginForm from "../auth/LoginForm.tsx";
import SearchBar from "../search/SearchBar.tsx";
import NavItem from "../common/NavItem.tsx";
import {useAuth} from "../../hooks/auth/useAuth.ts";
import CategoryOverlay from "./CategoryOverlay.tsx";

type HeaderPanel = "menu" | "search" | "login" | null;

export default function Header() {
    const {token, user, isLoading, retrySession} = useAuth();
    const [panel, setPanel] = useState<HeaderPanel>(null);
    const headerRef = useRef<HTMLElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);
    const location = useLocation();

    useEffect(() => { setPanel(null); }, [location.key]);

    useEffect(() => {
        if (!panel || panel === "menu") return;
        const handleOutside = (event: PointerEvent) => {
            if (!headerRef.current?.contains(event.target as Node)) setPanel(null);
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setPanel(null);
                triggerRef.current?.focus();
            }
        };
        document.addEventListener("pointerdown", handleOutside);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("pointerdown", handleOutside);
            document.removeEventListener("keydown", handleKey);
        };
    }, [panel]);

    useEffect(() => {
        const desktop = window.matchMedia("(min-width: 1024px)");
        const closeMobileSearch = () => {
            if (desktop.matches) setPanel(current => current === "search" ? null : current);
        };
        desktop.addEventListener("change", closeMobileSearch);
        return () => desktop.removeEventListener("change", closeMobileSearch);
    }, []);

    const togglePanel = (next: Exclude<HeaderPanel, null>) => {
        triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setPanel(current => current === next ? null : next);
    };

    return (
        <>
            <header ref={headerRef} className="sticky top-0 z-50 h-16 border-b border-accent-hover bg-accent text-canvas shadow-md">
                <div className="relative mx-auto flex h-full max-w-[1100px] items-center gap-3 px-3 sm:gap-4 sm:px-4">
                    <Link to="/" aria-label="MovieGraph home" className="flex min-h-11 shrink-0 items-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canvas">
                        <picture>
                            <source media="(min-width: 420px)" srcSet="/brand/wordmark-192.webp 1x, /brand/wordmark-384.webp 2x" />
                            <img src="/brand/icon-32.webp" srcSet="/brand/icon-64.webp 2x" alt="" width={32} height={32} className="h-8 w-8 object-contain min-[420px]:h-9 min-[420px]:w-44" />
                        </picture>
                    </Link>

                    <div className="hidden min-w-0 flex-1 lg:block">
                        <SearchBar />
                    </div>

                    <nav aria-label="Main navigation" className="ml-auto flex shrink-0 items-center gap-1 text-sm">
                        <NavItem onClick={() => togglePanel("search")} ariaLabel="Search movies" ariaExpanded={panel === "search"} ariaControls="header-search" className="lg:hidden">
                            <FaSearch aria-hidden="true" className="text-xl" />
                        </NavItem>
                        <NavItem onClick={() => togglePanel("menu")} ariaLabel="Menu" ariaExpanded={panel === "menu"} ariaControls="category-menu">
                            <span className="flex items-center gap-2"><FaBars aria-hidden="true" className="text-xl" /><span className="hidden xl:inline">Menu</span></span>
                        </NavItem>
                        {token && (
                            <NavItem to="/social" ariaLabel="Social">
                                <span className="flex items-center gap-2"><FaUsers aria-hidden="true" className="text-xl" /><span className="hidden xl:inline">Social</span></span>
                            </NavItem>
                        )}
                        {token && user ? (
                            <NavItem to={`/user/${encodeURIComponent(user.email || "")}`} ariaLabel="Your profile">
                                <span className="flex items-center gap-2"><FaUser aria-hidden="true" className="text-xl" /><span className="hidden max-w-24 truncate xl:inline">{user.username}</span></span>
                            </NavItem>
                        ) : token ? (
                            <NavItem onClick={retrySession} ariaLabel="Restore session">
                                <span className="flex items-center gap-2">{isLoading ? <FaSpinner aria-hidden="true" className="animate-spin" /> : <FaRedo aria-hidden="true" />}<span className="hidden xl:inline">{isLoading ? "Restoring" : "Retry"}</span></span>
                            </NavItem>
                        ) : (
                            <NavItem onClick={() => togglePanel("login")} ariaLabel="Login" ariaExpanded={panel === "login"} ariaControls="header-login">
                                <span className="flex items-center gap-2"><FaSignInAlt aria-hidden="true" className="text-xl" /><span className="hidden xl:inline">Login</span></span>
                            </NavItem>
                        )}
                    </nav>

                    {panel === "search" && (
                        <div id="header-search" role="region" aria-label="Movie search" className="absolute inset-x-3 top-full mt-2 rounded-lg border border-accent-hover bg-accent p-3 shadow-lg lg:hidden">
                            <SearchBar autoFocus onSelect={() => setPanel(null)} />
                        </div>
                    )}
                    {panel === "login" && !token && (
                        <section id="header-login" aria-label="Sign in" className="absolute inset-x-3 top-full mt-2 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain rounded-lg border border-border bg-panel p-4 text-ink shadow-lg sm:left-auto sm:w-80">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <h2 className="font-semibold">Sign in</h2>
                                <button type="button" aria-label="Close login" onClick={() => {setPanel(null); triggerRef.current?.focus();}} className="flex h-11 w-11 items-center justify-center rounded hover:bg-card focus-visible:outline-2 focus-visible:outline-accent"><FaTimes aria-hidden="true" /></button>
                            </div>
                            <LoginForm onSuccess={() => setPanel(null)} />
                        </section>
                    )}
                </div>
            </header>
            <CategoryOverlay open={panel === "menu"} onClose={() => setPanel(null)} />
        </>
    );
}
