import {api} from "./api.ts";
import {User} from "../types/user.ts";
import {API_FOLLOWS} from "../data/apiConstants.ts";

export const searchUsers = async (query: string, signal?: AbortSignal): Promise<User[]> => {
    const res = await api.get<User[]>(`${API_FOLLOWS}search`, {params: {query}, signal});
    return res.data;
};

export const getMyFollowing = async (signal?: AbortSignal): Promise<User[]> => {
    const res = await api.get<User[]>(`${API_FOLLOWS}following`, {signal});
    return res.data;
};

export const getMyFollowers = async (signal?: AbortSignal): Promise<User[]> => {
    const res = await api.get<User[]>(`${API_FOLLOWS}followers`, {signal});
    return res.data;
};

export const getFollowedMovieLikes = async (signal?: AbortSignal): Promise<number[]> => {
    const res = await api.get<number[]>(`${API_FOLLOWS}movie-likes`, {signal});
    return res.data;
};

export const followUser = async (publicId: string): Promise<void> => {
    await api.post(API_FOLLOWS, { public_id: publicId });
};

export const unfollowUser = async (publicId: string): Promise<void> => {
    await api.delete(API_FOLLOWS, { data: { public_id: publicId } });
};

export const getUserByEmail = async (email: string, signal?: AbortSignal): Promise<User> => {
    const res = await api.get(`${API_FOLLOWS}by_email`, { params: { email }, signal });
    return res.data;
};

export const getUserByPublicId = async (publicId: string, signal?: AbortSignal): Promise<User> => {
    const res = await api.get(`${API_FOLLOWS}users/${encodeURIComponent(publicId)}`, {signal});
    return res.data;
};

export const getAllUsers = async (): Promise<User[]> => {
    const res = await api.get(`${API_FOLLOWS}list`);
    return res.data;
};
