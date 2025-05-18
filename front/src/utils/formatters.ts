export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);
}

export function toEmbedUrl(url?: string): string | null {
    if (!url) return null;
    const match = url.match(/(?:\?v=|\/embed\/|\.be\/)([\w-]{11})/);
    const videoId = match?.[1];
    return videoId
        ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&showinfo=0`
        : null;
}