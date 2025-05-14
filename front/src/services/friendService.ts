import {api} from "./api.ts";
import {API_FRIENDS} from "../data/apiConstants.ts";

export const searchUsers = async (query: string) => {
    const res = await api.get(`${API_FRIENDS}/search`, {
        params: { query },
    });
    return res.data;
};

export const getFriends = async () => {
    const res = await api.get(API_FRIENDS);
    return res.data;
};

export const addFriend = async (email: string): Promise<void> => {
    const res = await api.post(API_FRIENDS, { email });
    return res.data;
};

export const fetchUserByEmail = async (email: string) => {
    const res = await api.get(`${API_FRIENDS}/by_email`, {
        params: { email },
    });
    return res.data;
};