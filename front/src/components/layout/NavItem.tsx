import {ReactNode} from "react";
import {Link} from "react-router-dom";

interface NavItemProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    to?: string;
    ariaLabel?: string;
    ariaExpanded?: boolean;
    ariaControls?: string;
}

export default function NavItem({ children, className = "", onClick, to, ariaLabel, ariaExpanded, ariaControls }: NavItemProps) {
    const baseStyles =
        "flex min-h-11 min-w-11 items-center justify-center gap-2 px-2 py-2 rounded-md hover:bg-canvas/10 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canvas";

    if (to) {
        return (
            <Link to={to} aria-label={ariaLabel} className={`${baseStyles} ${className}`}>
                {children}
            </Link>
        );
    }

    return (
        <button
            type="button"
            aria-label={ariaLabel}
            aria-expanded={ariaExpanded}
            aria-controls={ariaControls}
            onClick={onClick}
            className={`${baseStyles} border-0 bg-transparent font-[inherit] text-inherit ${className}`}
        >
            {children}
        </button>
    );
}
