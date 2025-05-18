import * as React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
}

export default function Textarea({ label, className = "", ...props }: TextareaProps) {
    return (
        <div className="flex flex-col gap-1 w-full">
            {label && <label className="text-sm text-white">{label}</label>}
            <textarea
                {...props}
                className={`p-2 rounded bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none ${className}`}
            />
        </div>
    );
}