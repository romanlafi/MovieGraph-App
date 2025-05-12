import {useState, useEffect, ReactNode} from "react";
import {User} from "../types/user.ts";
import {fetchUser} from "../services/authService.ts";
import { AuthContext } from "./AuthContext.ts";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(localStorage.getItem("access_token"));
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        if (!token) {
            setUser(null);
            return;
        }

        fetchUser()
            .then(setUser)
            .catch(() => {
                setToken(null);
                localStorage.removeItem("access_token");
                setUser(null);
            });
    }, [token]);

    const login = (newToken: string) => {
        localStorage.setItem("access_token", newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem("access_token");
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}