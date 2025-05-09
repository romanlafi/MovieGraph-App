import * as React from "react";

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export default function TextInput({ label, className = "", ...props }: TextInputProps) {
    return (
        <div className="flex flex-col gap-1 w-full">
            {label && <label className="text-sm text-white">{label}</label>}
            <input
                {...props}
                className={`p-2 rounded bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm ${className}`}
            />
        </div>
    );
}