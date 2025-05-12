import {AuthContextType} from "../types/auth.ts";
import {createContext} from "react";

export const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    login: () => {},
    logout: () => {},
});