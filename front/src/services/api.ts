import axios from "axios";
import {BASE_URL} from "../data/apiConstants.ts";

export const api = axios.create({
    baseURL: BASE_URL,
});

let movieGraphRequestQueue = Promise.resolve();
const releaseRequest = new WeakMap<object, () => void>();

api.interceptors.request.use(
    async (config) => {
        const token = localStorage.getItem("access_token");
        if (token) {
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
        }
        return Promise.reject(error);
    },
);
