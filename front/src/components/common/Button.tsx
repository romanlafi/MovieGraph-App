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
        "font-semibold py-2 px-4 rounded transition duration-200";

    const variants = {
        primary: "bg-purple-600 hover:bg-purple-700 text-white",
        secondary: "bg-neutral-700 hover:bg-neutral-600 text-white",
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
