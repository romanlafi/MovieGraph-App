import * as React from "react";

interface TextProps {
    text?: string;
    size?: "xs" | "sm" | "base" | "lg";
    color?: string;
    truncate?: boolean;
    italic?: boolean;
    weight?: "normal" | "medium" | "semibold" | "bold";
    className?: string;
    as?: "p" | "span" | "div";
    children?: React.ReactNode;
}

export default function Text({
                                 text = "",
                                 size = "sm",
                                 color = "white",
                                 truncate = false,
                                 italic = false,
                                 weight = "normal",
                                 className = "",
                                 as = "p",
                                 children,
                             }: TextProps) {
    const Tag = as;

    const sizeMap = {
        xs: "text-xs",
        sm: "text-sm",
        base: "text-base",
        lg: "text-lg",
    };

    const weightMap = {
        normal: "font-normal",
        medium: "font-medium",
        semibold: "font-semibold",
        bold: "font-bold",
    };

    return (
        <Tag
            className={`
        ${sizeMap[size]}
        text-${color}
        ${truncate ? "truncate" : ""}
        ${italic ? "italic" : ""}
        ${weightMap[weight]}
        ${className}
      `}
        >
            { text || children }
        </Tag>
    );
}