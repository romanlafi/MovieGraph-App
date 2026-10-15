export function getYoutubeEmbedUrl(videoId: string | undefined, autoplay = true): string {
    if (!videoId) return "";
    return `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&mute=1&rel=0&showinfo=0`;
}
