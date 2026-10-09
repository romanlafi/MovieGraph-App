import {ReactNode} from "react";
import {Link} from "react-router-dom";

interface NavItemProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    to?: string;
    ariaLabel?: string;
}

export default function NavItem({ children, className = "", onClick, to, ariaLabel }: NavItemProps) {
    const baseStyles =
        "flex flex-col items-center gap-2 px-2 py-2 rounded-md hover:bg-canvas/10 transition cursor-pointer";

    if (to) {
        return (
            <Link to={to} className={`${baseStyles} ${className}`}>
                {children}
            </Link>
        );
    }

    return (
        <button
            type="button"
            aria-label={ariaLabel}
            onClick={onClick}
            className={`${baseStyles} border-0 bg-transparent font-[inherit] text-inherit ${className}`}
        >
            {children}
        </button>
    );
}
