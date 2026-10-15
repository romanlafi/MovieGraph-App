import LoadMoreButton from "@/components/ui/LoadMoreButton.tsx";

interface MoviePaginationProps {
    error: string | null;
    hasMore: boolean;
    loadingMore: boolean;
    loadMore: () => Promise<void>;
}

export default function MoviePagination({error, hasMore, loadingMore, loadMore}: MoviePaginationProps) {
    return (
        <div className="space-y-4">
            {error && <p role="alert" className="text-center text-red-300">{error}</p>}
            {hasMore && (
                <LoadMoreButton onClick={loadMore} loading={loadingMore} label={error ? "Try Again" : "Load More"} />
            )}
        </div>
    );
}
