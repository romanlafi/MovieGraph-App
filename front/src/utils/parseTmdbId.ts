export function parseTmdbId(value: string | undefined): number | null {
    if (!value || !/^\d+$/.test(value)) return null;
    const tmdbId = Number(value);
    return Number.isSafeInteger(tmdbId) && tmdbId > 0 ? tmdbId : null;
}
