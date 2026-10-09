import {useEffect, useState} from "react";
import * as React from "react";
import {AxiosError} from "axios";
import {FaCheckCircle} from "react-icons/fa";
import {Link, useNavigate} from "react-router-dom";
import {getGenres} from "../../services/moviesService.ts";
import {registerUser} from "../../services/authService.ts";
import TextInput from "../ui/inputs/TextInput.tsx";
import Button from "../ui/Button.tsx";
import Textarea from "../ui/inputs/Textarea.tsx";
import GenreSelector from "../genre/GenreSelector.tsx";

interface RegistrationError {
    detail?: string | { message?: string };
}

export default function RegisterForm() {
    const [form, setForm] = useState({
        username: "",
        email: "",
        password: "",
        birthdate: "",
        bio: "",
        favorite_genres: [] as string[],
    });
    const [genres, setGenres] = useState<{ id: string; name: string }[]>([]);
    const [genresLoading, setGenresLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        let active = true;
        getGenres()
            .then((results) => {
                if (active) setGenres(results);
            })
            .catch(() => {
                if (active) setGenres([]);
            })
            .finally(() => {
                if (active) setGenresLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value} = event.target;
        setForm((current) => ({...current, [name]: value}));
    };

    const handleGenresChange = (genre: string) => {
        setForm((current) => ({
            ...current,
            favorite_genres: current.favorite_genres.includes(genre)
                ? current.favorite_genres.filter((favoriteGenre) => favoriteGenre !== genre)
                : [...current.favorite_genres, genre],
        }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            await registerUser(form);
            setIsRegistered(true);
        } catch (submissionError) {
            if (submissionError instanceof AxiosError) {
                const response = submissionError.response?.data as RegistrationError | undefined;
                const detail = response?.detail;
                const message = typeof detail === "string" ? detail : detail?.message;
                setError(message ?? "We couldn't create your account. Please try again.");
            } else {
                setError("We couldn't reach the server. Check your connection and try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

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

                    <form onSubmit={handleSubmit} className="space-y-5">
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
                                onChange={handleChange}
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
                                onChange={handleChange}
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
                                onChange={handleChange}
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
                                onChange={handleChange}
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
                            onChange={handleChange}
                            rows={3}
                        />

                        <fieldset className="rounded-lg border border-border bg-card p-4">
                            <legend className="px-1 text-sm font-semibold text-ink">Favorite genres</legend>
                            {genresLoading ? (
                                <p className="text-sm text-muted">Loading genres…</p>
                            ) : genres.length ? (
                                <GenreSelector
                                    genres={genres}
                                    selected={form.favorite_genres}
                                    onToggle={handleGenresChange}
                                />
                            ) : (
                                <p className="text-sm text-muted">Genres are unavailable. You can set them later.</p>
                            )}
                        </fieldset>

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
