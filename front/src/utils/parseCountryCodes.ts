export function parseCountryCodes(input: string | string[] | undefined): string[] {
    if (!input) return [];
    if (Array.isArray(input)) return input;
    return input.split(",").map((c) => c.trim()).filter(Boolean);
}