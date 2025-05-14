import axios from "axios";
import {API_ENDPOINTS} from "../data/apiConstants.ts";

const API_FRIENDS = API_ENDPOINTS.FRIENDS

export const searchUsers = async (query: string) => {
    const token = localStorage.getItem("access_token");
    const res = await axios.get(`${API_FRIENDS}/search`, {
        params: { query },
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

export const getFriends = async () => {
    const token = localStorage.getItem("access_token");
    const res = await axios.get(API_FRIENDS, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

export const addFriend = async (email: string) => {
    const token = localStorage.getItem("access_token");
    const res = await axios.post(
        API_FRIENDS,
        { email },
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    return res.data;
};

export const fetchUserByEmail = async (email: string) => {
    const res = await axios.get(`${API_FRIENDS}/by_email`, { params: { email } });
    return res.data;
};
