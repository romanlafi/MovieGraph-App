import {useEffect, useRef, useState} from "react";
import {useLocation} from "react-router-dom";

type HeaderPanel = "menu" | "search" | "login" | null;

export function useHeaderPanels() {
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

    const closePanel = () => setPanel(null);
    const closePanelAndRestoreFocus = () => {
        setPanel(null);
        triggerRef.current?.focus();
    };

    return {panel, headerRef, togglePanel, closePanel, closePanelAndRestoreFocus};
}
