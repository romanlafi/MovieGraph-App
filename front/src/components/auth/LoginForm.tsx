import {useAuth} from "../../contexts/AuthContext.tsx";
import {useState} from "react";
import {loginUser} from "../../services/authService.ts";
import * as React from "react";
import Button from "../common/Button.tsx";
import {Link} from "react-router-dom";
import TextInput from "../common/TextInput.tsx";

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
            <TextInput
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            <TextInput
                type="password"
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
                <Button type="submit" variant="primary" className="w-full">
                    Log in
                </Button>
            </div>
        </form>
    );
}