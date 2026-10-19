// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {clearSessionToken, getSessionToken, setSessionToken, subscribeToSession} from "@/services/session.ts";

describe("browser session storage", () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    it("publishes session changes when setting and clearing the stored token", () => {
        const onChange = vi.fn();
        const unsubscribe = subscribeToSession(onChange);
        setSessionToken("session-one");
        expect(getSessionToken()).toBe("session-one");
        expect(onChange).toHaveBeenCalledOnce();
        clearSessionToken("different-session");
        expect(getSessionToken()).toBe("session-one");
        expect(onChange).toHaveBeenCalledOnce();
        clearSessionToken("session-one");
        expect(getSessionToken()).toBeNull();
        expect(onChange).toHaveBeenCalledTimes(2);
        unsubscribe();
        setSessionToken("session-two");
        expect(onChange).toHaveBeenCalledTimes(2);
    });

    it("accepts only relevant browser storage events and removes listeners", () => {
        const onChange = vi.fn();
        const unsubscribe = subscribeToSession(onChange);
        window.dispatchEvent(new StorageEvent("storage", {key: "theme", storageArea: localStorage}));
        window.dispatchEvent(new StorageEvent("storage", {key: "access_token", storageArea: localStorage}));
        window.dispatchEvent(new StorageEvent("storage", {key: null, storageArea: localStorage}));
        expect(onChange).toHaveBeenCalledTimes(2);
        unsubscribe();
        window.dispatchEvent(new Event("moviegraph-session-change"));
        expect(onChange).toHaveBeenCalledTimes(2);
    });
});
