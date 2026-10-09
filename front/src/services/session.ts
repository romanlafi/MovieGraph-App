const TOKEN_KEY = "access_token";
const SESSION_EVENT = "moviegraph-session-change";

export function getSessionToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearSessionToken(expectedToken?: string): void {
    if (expectedToken !== undefined && getSessionToken() !== expectedToken) return;
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event(SESSION_EVENT));
}

export function subscribeToSession(onChange: () => void): () => void {
    const onStorage = (event: StorageEvent) => {
        if (event.storageArea === localStorage && (event.key === TOKEN_KEY || event.key === null)) {
            onChange();
        }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(SESSION_EVENT, onChange);
    return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(SESSION_EVENT, onChange);
    };
}
