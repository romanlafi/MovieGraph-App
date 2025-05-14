import {api} from "./api.ts";
import {API_AUTH} from "../data/apiConstants.ts";
import {RegisterUserData} from "../types/auth.ts";
import {User} from "../types/user.ts";

export const registerUser = async (data: RegisterUserData) => {
    const res = await api.post(`${API_AUTH}/register`, data);
    return res.data;
}

export const loginUser = async (email: string, password: string): Promise<string> => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const res = await api.post(`${API_AUTH}/login`, formData, {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });
    return res.data.access_token;
};

export const fetchUser = async (): Promise<User> => {
    const res = await api.get(`${API_AUTH}/me`);
    return res.data;
}