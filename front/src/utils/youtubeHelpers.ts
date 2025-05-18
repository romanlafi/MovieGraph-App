export function getYoutubeEmbedUrl(videoId: string | undefined, autoplay = true): string {
    return `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&mute=1&rel=0&showinfo=0`;
}

export function getYoutubeThumbnailUrl(videoId: string, quality: "default" | "mqdefault" | "hqdefault" | "sddefault" | "maxresdefault" = "hqdefault"): string {
    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}