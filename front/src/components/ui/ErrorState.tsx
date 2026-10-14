import Button from "./Button.tsx";

interface ErrorStateProps {
    message: string;
    onRetry: () => void | Promise<void>;
}

export default function ErrorState({message, onRetry}: ErrorStateProps) {
    return (
        <div className="space-y-4 text-center">
            <p role="alert" className="text-red-300">{message}</p>
            <Button onClick={() => { void onRetry(); }}>Try Again</Button>
        </div>
    );
}
