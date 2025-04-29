interface TitleProps {
    title?: string;
    size?: "lg" | "md" | "sm";
    className?: string;
}

export default function Title({ title = "", size = "lg", className = "" }: TitleProps) {
    const sizeClasses = {
        lg: "text-3xl",
        md: "text-2xl",
        sm: "text-xl",
    };

    return (
        <h2 className={`${sizeClasses[size]} font-bold text-white ${className}`}>
            {title}
        </h2>
    );
}