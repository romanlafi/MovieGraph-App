import Button from "./Button.tsx";

interface LoadMoreButtonProps {
    onClick: () => void | Promise<void>;
    loading?: boolean;
    label?: string;
}

export default function LoadMoreButton({onClick, loading = false, label = "Load More"}: LoadMoreButtonProps) {
    return (
        <div className="flex justify-center">
            <Button onClick={() => { void onClick(); }} disabled={loading}>
                {loading ? "Loading..." : label}
            </Button>
        </div>
    );
}
