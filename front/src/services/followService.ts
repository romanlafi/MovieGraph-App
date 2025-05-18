import {api} from "./api.ts";
import {User} from "../types/user.ts";
import {API_FOLLOWS} from "../data/apiConstants.ts";

export const searchUsers = async (query: string): Promise<User[]> => {
    const res = await api.get(`${API_FOLLOWS}/search`, { params: { query } });
    return res.data;
};

export const getMyFollowing = async (): Promise<User[]> => {
    const res = await api.get(`${API_FOLLOWS}/following`);
    return res.data;
};

export const getMyFollowers = async (): Promise<User[]> => {
    const res = await api.get(`${API_FOLLOWS}/followers`);
    return res.data;
};

export const followUser = async (email: string): Promise<void> => {
    await api.post(API_FOLLOWS, { email });
};

export const unfollowUser = async (email: string): Promise<void> => {
    await api.delete(API_FOLLOWS, { data: { email } });
};

export const getUserByEmail = async (email: string): Promise<User> => {
    const res = await api.get(`${API_FOLLOWS}/by_email`, { params: { email } });
    return res.data;
};

export const getAllUsers = async (): Promise<User[]> => {
    const res = await api.get(`${API_FOLLOWS}/list`);
    return res.data;
};
