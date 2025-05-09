import {ReactNode} from "react";
import {Link} from "react-router-dom";

interface NavItemProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    to?: string;
}

export default function NavItem({ children, className = "", onClick, to }: NavItemProps) {
    const baseStyles =
        "flex items-center gap-2 px-3 py-3 rounded-md hover:bg-white/10 transition text-white cursor-pointer";

    if (to) {
        return (
            <Link to={to} className={`${baseStyles} ${className}`}>
                {children}
            </Link>
        );
    }

    return (
        <div onClick={onClick} className={`${baseStyles} ${className}`}>
            {children}
        </div>
    );
}