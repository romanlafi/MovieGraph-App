import {User} from "./user.ts";

export interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string) => void;
    logout: () => void;
    retrySession: () => void;
}

export interface RegisterUserData {
    username: string;
    email: string;
    password: string;
    birthdate?: string;
    bio?: string;
    favorite_genres?: string[];
}
