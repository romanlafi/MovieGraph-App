import {useState} from "react";
import * as React from "react";
import Button from "../common/Button.tsx";

interface CommentFormProps {
    onSubmit: (text: string) => Promise<void>;
}

export default function CommentForm({ onSubmit }: CommentFormProps) {
    const [text, setText] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        await onSubmit(text);
        setText("");
    };

    return (
        <form onSubmit={handleSubmit} className="bg-neutral-900 rounded-lg p-4 w-full h-full flex flex-col gap-2">
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="bg-neutral-700 text-white rounded p-2 resize-none flex-1"
                placeholder="Write your comment..."
            />
            <Button type="submit" variant="primary">
                Submit
            </Button>
        </form>
    );
}