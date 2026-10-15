import {FaCheckCircle} from "react-icons/fa";
import {Link, useNavigate} from "react-router-dom";
import {useRegistrationForm} from "@/hooks/auth/useRegistrationForm.ts";
import TextInput from "@/components/ui/inputs/TextInput.tsx";
import Button from "@/components/ui/Button.tsx";
import Textarea from "@/components/ui/inputs/Textarea.tsx";
import RegistrationGenres from "./RegistrationGenres.tsx";
import {PASSWORD_MIN_LENGTH, todayDate} from "@/utils/registrationValidation.ts";
import type {RegistrationField} from "@/utils/registrationValidation.ts";

export default function RegisterForm() {
    const {form, updateField, toggleGenre, touchField, fieldErrors, submit, error, isSubmitting, isRegistered} = useRegistrationForm();
    const navigate = useNavigate();
    const fieldProps = (field: RegistrationField) => ({
        onBlur: () => touchField(field),
        disabled: isSubmitting,
        "aria-invalid": Boolean(fieldErrors[field]),
        "aria-describedby": `register-${field}-feedback`,
    });

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

                    <form noValidate onSubmit={async event => {
                        event.preventDefault();
                        const element = event.currentTarget;
                        if (!await submit()) requestAnimationFrame(() => element.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
                    }} className="space-y-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
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
                                    {...fieldProps("username")}
                                    required
                                />
                                <p id="register-username-feedback" className={`mt-1 text-xs ${fieldErrors.username ? "text-red-300" : "text-muted"}`}>
                                    {fieldErrors.username ?? "Between 2 and 40 characters."}
                                </p>
                            </div>
                            <div>
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
                                    {...fieldProps("email")}
                                    required
                                />
                                <p id="register-email-feedback" className="mt-1 text-xs text-red-300">{fieldErrors.email}</p>
                            </div>
                            <div>
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
                                    minLength={PASSWORD_MIN_LENGTH}
                                    {...fieldProps("password")}
                                    required
                                />
                                <p id="register-password-feedback" className={`mt-1 text-xs ${fieldErrors.password ? "text-red-300" : "text-muted"}`}>
                                    {fieldErrors.password ?? "Use at least 12 characters for your password."}
                                </p>
                            </div>
                            <div>
                                <TextInput
                                    id="register-birthdate"
                                    label="Date of birth"
                                    type="date"
                                    name="birthdate"
                                    autoComplete="bday"
                                    className="!bg-card"
                                    value={form.birthdate}
                                    onChange={event => updateField("birthdate", event.target.value)}
                                    max={todayDate()}
                                    {...fieldProps("birthdate")}
                                    required
                                />
                                <p id="register-birthdate-feedback" className="mt-1 text-xs text-red-300">{fieldErrors.birthdate}</p>
                            </div>
                        </div>

                        <div>
                            <Textarea
                                id="register-bio"
                                label="Bio (optional)"
                                name="bio"
                                placeholder="A little about you"
                                className="!bg-card"
                                value={form.bio}
                                onChange={event => updateField("bio", event.target.value)}
                                {...fieldProps("bio")}
                                rows={3}
                            />
                            <p id="register-bio-feedback" className={`mt-1 text-xs ${fieldErrors.bio ? "text-red-300" : "text-muted"}`}>
                                {fieldErrors.bio ?? `${Array.from(form.bio).length}/500 characters`}
                            </p>
                        </div>

                        <RegistrationGenres selected={form.favorite_genres} onToggle={toggleGenre} error={fieldErrors.favorite_genres} disabled={isSubmitting} />

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
