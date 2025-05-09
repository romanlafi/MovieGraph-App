import axios from "axios";
import {API_ENDPOINTS} from "../data/apiConstants.ts";
import {User} from "../types/user.ts";

const API_USERS = API_ENDPOINTS.USERS;

export const registerUser = async (data: unknown) => {
    const res = await axios.post(`${API_USERS}/`, data);
    return res.data;
};

export const loginUser = async (email: string, password: string): Promise<string> => {
    const params = new URLSearchParams();
    params.append("username", email);
    params.append("password", password);

    const res = await axios.post(`${API_USERS}/login`, params, {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    return res.data.access_token;
};

export const fetchUser = async (): Promise<User> => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("No authorization token");
    }

    const res = await axios.get(
        `${API_USERS}/me`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        }
    );

    return res.data;
}