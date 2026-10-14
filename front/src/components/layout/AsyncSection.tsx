import type {ReactNode} from "react";
import ErrorState from "../ui/ErrorState.tsx";
import Title from "../ui/Title.tsx";

interface AsyncSectionProps {
    title: string;
    loading: boolean;
    error: boolean;
    empty: boolean;
    errorMessage: string;
    emptyMessage?: string;
    onRetry: () => void | Promise<void>;
    children: ReactNode;
}

export default function AsyncSection({title, loading, error, empty, errorMessage, emptyMessage, onRetry, children}: AsyncSectionProps) {
    if (empty) {
        if (!loading && !error && !emptyMessage) return null;
        return (
            <section className="bg-panel rounded-xl p-6 shadow space-y-4">
                <Title title={title} as="h2" size="md" />
                {loading ? <p role="status" className="text-muted">Loading...</p>
                    : error ? <ErrorState message={errorMessage} onRetry={onRetry} />
                        : <p className="text-muted">{emptyMessage}</p>}
            </section>
        );
    }

    return (
        <>
            {loading && <p role="status" className="text-muted">Updating {title.toLowerCase()}...</p>}
            {error && !loading && <ErrorState message={errorMessage} onRetry={onRetry} />}
            {children}
        </>
    );
}
