import {FaCheckCircle} from "react-icons/fa";
import {Link, useNavigate} from "react-router-dom";
import {useRegistrationForm} from "../../hooks/auth/useRegistrationForm.ts";
import TextInput from "../ui/inputs/TextInput.tsx";
import Button from "../ui/Button.tsx";
import Textarea from "../ui/inputs/Textarea.tsx";
import RegistrationGenres from "./RegistrationGenres.tsx";

export default function RegisterForm() {
    const {form, updateField, toggleGenre, submit, error, isSubmitting, isRegistered} = useRegistrationForm();
    const navigate = useNavigate();

    return (
        <section className="mx-auto max-w-3xl rounded-xl bg-panel p-6 shadow sm:p-8">
            {isRegistered ? (
                <div className="py-10 text-center">
                    <FaCheckCircle className="mx-auto mb-4 text-4xl text-accent" aria-hidden="true" />
                    <h1 className="text-2xl font-bold text-ink">Account created</h1>
                    <p className="mt-2 text-muted">You can sign in from the Login button in the header.</p>
                    <Button onClick={() => navigate("/")} className="mt-6 px-6 py-2">
                        Back to MovieGraph
                    </Button>
                </div>
            ) : (
                <>
                    <header className="mb-7">
                        <h1 className="text-2xl font-bold text-ink">Create your account</h1>
                        <p className="mt-2 text-sm text-muted">Set up your profile and choose the films you enjoy.</p>
                    </header>

                    {error && (
                        <div role="alert" className="mb-5 rounded border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                            {error}
                        </div>
                    )}

                    <form onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <TextInput
                                id="register-username"
                                label="Username"
                                type="text"
                                name="username"
                                autoComplete="username"
                                placeholder="Your username"
                                className="!bg-card"
                                value={form.username}
                                onChange={event => updateField("username", event.target.value)}
                                required
                            />
                            <TextInput
                                id="register-email"
                                label="Email"
                                type="email"
                                name="email"
                                autoComplete="email"
                                placeholder="you@example.com"
                                className="!bg-card"
                                value={form.email}
                                onChange={event => updateField("email", event.target.value)}
                                required
                                pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                                onInvalid={(event) => event.currentTarget.setCustomValidity("Please enter a valid email address.")}
                                onInput={(event) => event.currentTarget.setCustomValidity("")}
                            />
                            <TextInput
                                id="register-password"
                                label="Password"
                                type="password"
                                name="password"
                                autoComplete="new-password"
                                placeholder="Choose a password"
                                className="!bg-card"
                                value={form.password}
                                onChange={event => updateField("password", event.target.value)}
                                required
                            />
                            <TextInput
                                id="register-birthdate"
                                label="Date of birth"
                                type="date"
                                name="birthdate"
                                autoComplete="bday"
                                className="!bg-card"
                                value={form.birthdate}
                                onChange={event => updateField("birthdate", event.target.value)}
                                required
                            />
                        </div>

                        <Textarea
                            id="register-bio"
                            label="Bio (optional)"
                            name="bio"
                            placeholder="A little about you"
                            className="!bg-card"
                            value={form.bio}
                            onChange={event => updateField("bio", event.target.value)}
                            rows={3}
                        />

                        <RegistrationGenres selected={form.favorite_genres} onToggle={toggleGenre} />

                        <Button type="submit" disabled={isSubmitting} className="w-full py-2">
                            {isSubmitting ? "Creating account…" : "Create account"}
                        </Button>
                        <p className="text-center text-sm text-muted">
                            Already registered? <Link to="/" className="font-semibold text-accent hover:underline">Sign in from the header</Link>
                        </p>
                    </form>
                </>
            )}
        </section>
    );
}
