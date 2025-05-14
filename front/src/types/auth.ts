import {User} from "./user.ts";

export interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string) => void;
    logout: () => void;
}

export interface RegisterUserData {
    username: string;
    email: string;
    password: string;
    birthdate?: string;
    bio?: string;
    favorite_genres?: string[];
}