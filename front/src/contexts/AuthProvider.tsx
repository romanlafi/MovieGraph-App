import {useState, useEffect, ReactNode} from "react";
import axios from "axios";
import {User} from "../types/user.ts";
import {fetchUser} from "../services/authService.ts";
import { AuthContext } from "./AuthContext.ts";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(localStorage.getItem("access_token"));
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(Boolean(token));
    const [restoreAttempt, setRestoreAttempt] = useState(0);

    useEffect(() => {
        if (!token) {
            setUser(null);
            setIsLoading(false);
            return;
        }

        let active = true;
        setIsLoading(true);
        fetchUser()
            .then((profile) => {
                if (active) setUser(profile);
            })
            .catch((error: unknown) => {
                if (!active) return;
                if (axios.isAxiosError(error) && error.response?.status === 401) {
                    localStorage.removeItem("access_token");
                    setToken(null);
                    setUser(null);
                    return;
                }
                setUser(null);
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });

        return () => {
            active = false;
        };
    }, [token, restoreAttempt]);

    const login = (newToken: string) => {
        localStorage.setItem("access_token", newToken);
        setUser(null);
        setIsLoading(true);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem("access_token");
        setToken(null);
        setUser(null);
        setIsLoading(false);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout, retrySession: () => setRestoreAttempt((attempt) => attempt + 1) }}>
            {children}
        </AuthContext.Provider>
    );
}
