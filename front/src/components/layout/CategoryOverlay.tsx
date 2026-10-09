import {FaCalendarAlt, FaFilm, FaFolderOpen, FaHome, FaStar, FaTimes, FaTrophy} from "react-icons/fa";
import {NavLink} from "react-router-dom";
import {useEffect, useRef} from "react";
import {useAuth} from "../../hooks/auth/useAuth.ts";

export default function CategoryOverlay({open, onClose}: {open: boolean; onClose: () => void}) {
    const {user} = useAuth();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const previousOverflow = useRef<string | null>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        return () => {
            if (dialog?.open) dialog.close();
            if (previousOverflow.current !== null) document.body.style.overflow = previousOverflow.current;
        };
    }, []);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (!open && !dialog.open) return;
        if (open) {
            if (previousOverflow.current === null) previousOverflow.current = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            if (!dialog.open) dialog.showModal();
            dialog.scrollTop = 0;
        }
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const animation = dialog.animate(
            open
                ? [{transform: "translateY(-100%)"}, {transform: "translateY(0)"}]
                : [{transform: getComputedStyle(dialog).transform}, {transform: "translateY(-100%)"}],
            {duration: reducedMotion ? 0 : 300, easing: "ease-in-out"},
        );
        animation.onfinish = () => {
            if (open) return;
            dialog.close();
            if (previousOverflow.current !== null) document.body.style.overflow = previousOverflow.current;
            previousOverflow.current = null;
        };
        return () => {
            animation.cancel();
        };
    }, [open]);

    const items = [
        {to: "/", label: "Home", icon: FaHome},
        {to: "/genres", label: "Genres", icon: FaFilm},
        {to: "/collections", label: "Collections", icon: FaFolderOpen},
        ...(user ? [{to: "/recommendations", label: "Recommended for You", icon: FaStar}] : []),
        {to: "/top-rated", label: "Top Rated", icon: FaTrophy},
        {to: "/latest", label: "Latest Releases", icon: FaCalendarAlt},
    ];

    return (
        <dialog
            ref={dialogRef}
            id="category-menu"
            aria-labelledby="category-menu-title"
            onClose={event => { if (!event.currentTarget.open) onClose(); }}
            onCancel={event => {
                event.preventDefault();
                onClose();
            }}
            className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto overscroll-contain border-0 bg-accent p-0 text-canvas"
        >
            <div className="sticky top-0 z-10 mx-auto flex max-w-screen-md items-center justify-between gap-4 border-b border-canvas/20 bg-accent px-6 py-6">
                <h2 id="category-menu-title" className="text-3xl font-bold">Categories</h2>
                <button type="button" autoFocus aria-label="Close menu" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-canvas/10 hover:bg-canvas/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canvas">
                    <FaTimes aria-hidden="true" className="text-xl" />
                </button>
            </div>
            <nav aria-label="Categories" className="mx-auto flex max-w-screen-md flex-col gap-8 px-6 pb-10 pt-12">
                {items.map(({to, label, icon: Icon}) => (
                    <NavLink key={to} to={to} end={to === "/"} onClick={onClose}
                        className={({isActive}) => `group flex min-h-11 items-center gap-3 rounded-lg px-3 text-xl font-medium transition-all duration-200 hover:translate-x-1.5 hover:scale-[1.02] hover:bg-canvas/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canvas motion-reduce:transform-none motion-reduce:transition-none ${isActive ? "bg-canvas/10" : ""}`}>
                        <Icon aria-hidden="true" className="shrink-0 text-lg transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none" />{label}
                    </NavLink>
                ))}
            </nav>
        </dialog>
    );
}
