import * as React from "react";

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export default function TextInput({ label, className = "", ...props }: TextInputProps) {
    return (
        <div className="flex flex-col gap-1 w-full">
            {label && <label className="text-sm text-ink">{label}</label>}
            <input
                {...props}
                className={`p-2 rounded bg-panel border border-border text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm ${className}`}
            />
        </div>
    );
}
