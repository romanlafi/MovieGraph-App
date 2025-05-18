import * as React from "react";

interface TitleProps {
    title?: string;
    size?: "xl" | "lg" | "md" | "sm";
    as?: "h1" | "h2" | "h3" | "h4";
    className?: string;
    color?: string;
    center?: boolean;
    children?: React.ReactNode;
    onClick?: () => void;
}

export default function Title({
                                  title = "",
                                  size = "lg",
                                  as = "h2",
                                  className = "",
                                  color = "text-white",
                                  center = false,
                                  children,
                                  onClick,
                              }: TitleProps) {
    const Tag = as;
    const sizeClasses = {
        xl: "text-4xl",
        lg: "text-3xl",
        md: "text-2xl",
        sm: "text-xl",
    };

    return (
        <Tag
            className={`${sizeClasses[size]} font-bold ${color} ${center ? "text-center" : ""} ${className}`}
            onClick={onClick}
        >
            {title || children}
        </Tag>
    );
}