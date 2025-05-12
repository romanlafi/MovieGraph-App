import axios from "axios";
import {BASE_URL} from "../data/apiConstants.ts";

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

export default api;