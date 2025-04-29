import {useAuth} from "../../contexts/AuthContext.tsx";
import {useState} from "react";
import {loginUser} from "../../services/authService.ts";
import * as React from "react";
import Button from "../common/Button.tsx";

export default function LoginForm({ onSuccess }: { onSuccess: () => void }) {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = await loginUser(email, password);
            login(token);
            onSuccess();
        } catch (err) {
            console.error(err);
            setError("Email o contraseña incorrectos.");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-white">
            {error && (
                <p className="text-red-400 text-sm">{error}</p>
            )}
            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-2 rounded bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                required
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-2 rounded bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                required
            />
            <Button type="submit" variant="primary">
                Log in
            </Button>
        </form>
    );
}