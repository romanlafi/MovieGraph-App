import type {ReactNode} from "react";
import ErrorState from "@/components/ui/ErrorState.tsx";
import Title from "@/components/ui/Title.tsx";

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
        let emptyContent: ReactNode;
        if (loading) emptyContent = <output className="block text-muted">Loading...</output>;
        else if (error) emptyContent = <ErrorState message={errorMessage} onRetry={onRetry} />;
        else emptyContent = <p className="text-muted">{emptyMessage}</p>;
        return (
            <section className="bg-panel rounded-xl p-6 shadow space-y-4">
                <Title title={title} as="h2" size="md" />
                {emptyContent}
            </section>
        );
    }

    return (
        <>
            {loading && <output className="block text-muted">Updating {title.toLowerCase()}...</output>}
            {error && !loading && <ErrorState message={errorMessage} onRetry={onRetry} />}
            {children}
        </>
    );
}
