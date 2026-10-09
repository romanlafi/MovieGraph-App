import axios from "axios";
import {BASE_URL} from "../data/apiConstants.ts";
import {clearSessionToken, getSessionToken} from "./session.ts";

export const api = axios.create({
    baseURL: BASE_URL,
});

let movieGraphRequestQueue = Promise.resolve();
const releaseRequest = new WeakMap<object, () => void>();

api.interceptors.request.use(
    async (config) => {
        const token = getSessionToken();
        if (token && !config.headers.Authorization && !config.url?.endsWith("/users/login")) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        const requestUrl = `${config.baseURL ?? ""}${config.url ?? ""}`;
        if (requestUrl.includes("/api/v1/")) {
            const previousRequest = movieGraphRequestQueue;
            let release = () => {};
            movieGraphRequestQueue = new Promise<void>((resolve) => {
                release = resolve;
            });
            await previousRequest;
            releaseRequest.set(config, release);
        }

        const authorization = config.headers.Authorization;
        if (typeof authorization === "string" && authorization.startsWith("Bearer ")
            && authorization.slice(7) !== getSessionToken()) {
            const cancellation = new axios.CanceledError("Session changed before the request was sent");
            cancellation.config = config;
            throw cancellation;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => {
        releaseRequest.get(response.config)?.();
        releaseRequest.delete(response.config);
        return response;
    },
    (error) => {
        if (error.config) {
            releaseRequest.get(error.config)?.();
            releaseRequest.delete(error.config);
            const authorization = error.config.headers?.Authorization;
            if (error.response?.status === 401 && !error.config.url?.endsWith("/users/login")
                && typeof authorization === "string" && authorization.startsWith("Bearer ")) {
                clearSessionToken(authorization.slice(7));
            }
        }
        return Promise.reject(error);
    },
);
