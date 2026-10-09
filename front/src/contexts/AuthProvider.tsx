import {useState, useEffect, useSyncExternalStore, ReactNode} from "react";
import axios from "axios";
import {User} from "../types/user.ts";
import {fetchUser} from "../services/authService.ts";
import {clearSessionToken, getSessionToken, setSessionToken, subscribeToSession} from "../services/session.ts";
import {AuthContext} from "./AuthContext.ts";

interface RestoredSession {
    token: string;
    user: User | null;
    isLoading: boolean;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const token = useSyncExternalStore(subscribeToSession, getSessionToken, () => null);
    const [session, setSession] = useState<RestoredSession | null>(null);
    const [restoreAttempt, setRestoreAttempt] = useState(0);
    const user = session?.token === token ? session.user : null;
    const isLoading = Boolean(token && (session?.token !== token || session.isLoading));

    useEffect(() => {
        if (!token) {
            setSession(null);
            return;
        }

        let active = true;
        const controller = new AbortController();
        setSession({token, user: null, isLoading: true});
        fetchUser(token, controller.signal)
            .then((profile) => {
                if (active && getSessionToken() === token) {
                    setSession({token, user: profile, isLoading: false});
                }
            })
            .catch((error: unknown) => {
                if (!active || getSessionToken() !== token) return;
                if (axios.isAxiosError(error) && error.response?.status === 401) {
                    clearSessionToken(token);
                    return;
                }
                setSession({token, user: null, isLoading: false});
            });

        return () => {
            active = false;
            controller.abort();
        };
    }, [token, restoreAttempt]);

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isLoading,
            login: setSessionToken,
            logout: () => clearSessionToken(),
            retrySession: () => setRestoreAttempt((attempt) => attempt + 1),
        }}>
            {children}
        </AuthContext.Provider>
    );
}
