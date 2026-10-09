import {useState} from "react";
import {loginUser} from "../../services/authService.ts";
import * as React from "react";
import axios from "axios";
import Button from "../ui/Button.tsx";
import {Link} from "react-router-dom";
import TextInput from "../ui/inputs/TextInput.tsx";
import {useAuth} from "../../hooks/auth/useAuth.ts";

export default function LoginForm({ onSuccess }: { onSuccess: () => void }) {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setError("");
        setIsSubmitting(true);
        try {
            const token = await loginUser(email, password);
            login(token);
            onSuccess();
        } catch (err) {
            setError(axios.isAxiosError(err) && err.response?.status === 401
                ? "Wrong email or password"
                : "Login is temporarily unavailable. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-ink">
            {error && (
                <p role="alert" className="text-red-400 text-sm">{error}</p>
            )}
            <TextInput
                type="email"
                autoComplete="username"
                aria-label="Email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            <TextInput
                type="password"
                autoComplete="current-password"
                aria-label="Password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            <div className="flex justify-between items-center gap-4 w-full mt-2">
                <Link to="register" className="w-full">
                    <Button type="button" variant="secondary" className="w-full">
                        Register
                    </Button>
                </Link>
                <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Logging in…" : "Log in"}
                </Button>
            </div>
        </form>
    );
}
