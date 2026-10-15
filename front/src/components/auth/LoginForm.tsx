import {useLoginForm} from "../../hooks/auth/useLoginForm.ts";
import Button from "../ui/Button.tsx";
import {Link} from "react-router-dom";
import TextInput from "../ui/inputs/TextInput.tsx";

export default function LoginForm({onSuccess}: {onSuccess: () => void}) {
    const {credentials, updateField, submit, error, isSubmitting} = useLoginForm(onSuccess);

    return (
        <form onSubmit={event => { event.preventDefault(); void submit(); }} className="flex flex-col gap-3 text-ink">
            {error && (
                <p role="alert" className="text-red-400 text-sm">{error}</p>
            )}
            <TextInput
                type="email"
                autoComplete="username"
                aria-label="Email"
                placeholder="Email"
                value={credentials.email}
                onChange={event => updateField("email", event.target.value)}
                required
            />
            <TextInput
                type="password"
                autoComplete="current-password"
                aria-label="Password"
                placeholder="Password"
                value={credentials.password}
                onChange={event => updateField("password", event.target.value)}
                required
            />
            <div className="flex justify-between items-center gap-4 w-full mt-2">
                <Link to="/register" className="w-full rounded bg-card px-4 py-1 text-center font-semibold transition duration-200 hover:bg-border">
                    Register
                </Link>
                <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Logging in…" : "Log in"}
                </Button>
            </div>
        </form>
    );
}
