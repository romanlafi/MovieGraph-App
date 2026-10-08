import { ReactNode } from "react";

interface ButtonProps {
    children: ReactNode;
    onClick?: () => void;
    type?: "button" | "submit";
    disabled?: boolean;
    variant?: "primary" | "secondary";
    className?: string;
}

export default function Button({
                                   children,
                                   onClick,
                                   type = "button",
                                   disabled = false,
                                   variant = "primary",
                                   className = "",
                               }: ButtonProps) {
    const baseClasses =
        "font-semibold py-1 px-4 rounded transition duration-200";

    const variants = {
        primary: "bg-accent hover:bg-accent-hover text-canvas",
        secondary: "bg-card hover:bg-border text-ink",
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${variants[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
        >
            {children}
        </button>
    );
}
