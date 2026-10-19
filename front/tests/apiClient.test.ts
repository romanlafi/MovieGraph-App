import axios, {AxiosHeaders, type AxiosAdapter, type AxiosResponse} from "axios";
import {beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({clearSessionToken: vi.fn(), getSessionToken: vi.fn()}));
vi.mock("@/services/session.ts", () => ({
    clearSessionToken: mocks.clearSessionToken,
    getSessionToken: mocks.getSessionToken,
}));

import {api} from "@/services/api.ts";

const response = (config: Parameters<AxiosAdapter>[0], data: unknown): AxiosResponse => ({
    data,
    status: 200,
    statusText: "OK",
    headers: new AxiosHeaders(),
    config,
});

describe("shared API client", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSessionToken.mockReturnValue(null);
    });

    it("attaches current session tokens except to explicit login requests", async () => {
        mocks.getSessionToken.mockReturnValue("session-token");
        let observedAuthorization: unknown;
        const adapter: AxiosAdapter = async config => {
            observedAuthorization = config.headers.Authorization;
            return response(config, {});
        };
        await api.get("/movies", {adapter});
        expect(observedAuthorization).toBe("Bearer session-token");
        observedAuthorization = undefined;
        await api.post("/users/login", {}, {adapter});
        expect(observedAuthorization).toBeUndefined();
        observedAuthorization = undefined;
        mocks.getSessionToken.mockReturnValue("explicit-token");
        await api.get("/movies", {adapter, headers: {Authorization: "Bearer explicit-token"}});
        expect(observedAuthorization).toBe("Bearer explicit-token");
    });

    it("cancels stale bearer tokens and clears the matching token on unauthorized responses", async () => {
        mocks.getSessionToken.mockReturnValueOnce("old-session").mockReturnValueOnce("new-session");
        await expect(api.get("/movies", {adapter: async config => response(config, {})}))
            .rejects.toBeInstanceOf(axios.CanceledError);

        mocks.getSessionToken.mockReturnValue("expired-session");
        const adapter: AxiosAdapter = async config => {
            const error = new axios.AxiosError("Unauthorized", "ERR_BAD_REQUEST", config);
            error.response = {
                data: {}, status: 401, statusText: "Unauthorized", headers: new AxiosHeaders(), config,
            };
            throw error;
        };
        await expect(api.get("/movies", {adapter})).rejects.toBeInstanceOf(axios.AxiosError);
        expect(mocks.clearSessionToken).toHaveBeenCalledWith("expired-session");
    });

    it("serializes MovieGraph API requests and releases the queue after completion", async () => {
        const sent: string[] = [];
        let releaseFirst: (() => void) | undefined;
        const adapter: AxiosAdapter = async config => {
            sent.push(config.url ?? "");
            if (config.url === "/first") await new Promise<void>(resolve => { releaseFirst = resolve; });
            return response(config, {});
        };
        const first = api.get("/first", {adapter});
        const second = api.get("/second", {adapter});
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(sent).toEqual(["/first"]);
        releaseFirst?.();
        await Promise.all([first, second]);
        expect(sent).toEqual(["/first", "/second"]);
    });

    it("releases the serial queue when an API request fails", async () => {
        const sent: string[] = [];
        const adapter: AxiosAdapter = async config => {
            sent.push(config.url ?? "");
            if (config.url === "/failure") throw new axios.AxiosError("Offline", "ERR_NETWORK", config);
            return response(config, {});
        };
        const failed = api.get("/failure", {adapter}).catch(() => undefined);
        const following = api.get("/after-failure", {adapter});
        await Promise.all([failed, following]);
        expect(sent).toEqual(["/failure", "/after-failure"]);
    });
});
