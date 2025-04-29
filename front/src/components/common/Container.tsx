import * as React from "react";
import clsx from "clsx";

interface ContainerProps {
    children: React.ReactNode;
    className?: string;
}

export default function Container({ children, className }: ContainerProps) {
    return (
        <div className={clsx("w-full max-w-[1100px] mx-auto px-4", className)}>
            {children}
        </div>
    );
}