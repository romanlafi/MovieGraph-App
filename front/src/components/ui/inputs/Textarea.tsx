import * as React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
}

export default function Textarea({ label, className = "", ...props }: TextareaProps) {
    return (
        <div className="flex flex-col gap-1 w-full">
            {label && <label htmlFor={props.id} className="text-sm font-medium text-ink">{label}</label>}
            <textarea
                {...props}
                className={`p-2 rounded bg-panel border border-border text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-none ${className}`}
            />
        </div>
    );
}
