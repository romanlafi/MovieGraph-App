import {renderToStaticMarkup} from "react-dom/server";
import {MemoryRouter} from "react-router-dom";
import {beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({
    useLoginForm: vi.fn(),
    useRegistrationForm: vi.fn(),
    useAsyncResource: vi.fn(),
}));

vi.mock("@/hooks/auth/useLoginForm.ts", () => ({useLoginForm: mocks.useLoginForm}));
vi.mock("@/hooks/auth/useRegistrationForm.ts", () => ({useRegistrationForm: mocks.useRegistrationForm}));
vi.mock("@/hooks/useAsyncResource.ts", () => ({useAsyncResource: mocks.useAsyncResource}));

import LoginForm from "@/components/auth/LoginForm.tsx";
import RegisterForm from "@/components/auth/RegisterForm.tsx";

const render = (element: React.ReactElement) => renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);

describe("authentication forms", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.useLoginForm.mockReturnValue({
            credentials: {email: "", password: ""},
            updateField: vi.fn(),
            submit: vi.fn(),
            error: "",
            isSubmitting: false,
        });
        mocks.useRegistrationForm.mockReturnValue({
            form: {username: "", email: "", password: "", birthdate: "", bio: "", favorite_genres: []},
            updateField: vi.fn(),
            toggleGenre: vi.fn(),
            touchField: vi.fn(),
            fieldErrors: {},
            submit: vi.fn(),
            error: null,
            isSubmitting: false,
            isRegistered: false,
        });
        mocks.useAsyncResource.mockReturnValue({data: null, loading: false});
    });

    it("renders sign-in fields and reports authentication errors", () => {
        mocks.useLoginForm.mockReturnValueOnce({
            credentials: {email: "cinefan@example.test", password: "secret"},
            updateField: vi.fn(),
            submit: vi.fn(),
            error: "Wrong email or password",
            isSubmitting: true,
        });
        const markup = render(<LoginForm onSuccess={vi.fn()} />);
        expect(markup).toContain("Wrong email or password");
        expect(markup).toContain('aria-label="Email"');
        expect(markup).toContain('aria-label="Password"');
        expect(markup).toContain("Logging in");
    });

    it("renders validated registration fields and server-side feedback", () => {
        mocks.useRegistrationForm.mockReturnValueOnce({
            form: {username: "", email: "", password: "", birthdate: "", bio: "", favorite_genres: []},
            updateField: vi.fn(),
            toggleGenre: vi.fn(),
            touchField: vi.fn(),
            fieldErrors: {username: "Choose a username", password: "Password is too short"},
            submit: vi.fn(),
            error: "Please check the highlighted fields.",
            isSubmitting: false,
            isRegistered: false,
        });
        const markup = render(<RegisterForm />);
        expect(markup).toContain("Create your account");
        expect(markup).toContain("Please check the highlighted fields.");
        expect(markup).toContain("Choose a username");
        expect(markup).toContain("Password is too short");
        expect(markup).toContain("Genres are unavailable");
        expect(markup).toContain("Already registered?");
    });

    it("renders the successful registration state", () => {
        mocks.useRegistrationForm.mockReturnValueOnce({
            form: {username: "cinefan", email: "cinefan@example.test", password: "long-password", birthdate: "1990-01-01", bio: "", favorite_genres: []},
            updateField: vi.fn(),
            toggleGenre: vi.fn(),
            touchField: vi.fn(),
            fieldErrors: {},
            submit: vi.fn(),
            error: null,
            isSubmitting: false,
            isRegistered: true,
        });
        const markup = render(<RegisterForm />);
        expect(markup).toContain("Account created");
        expect(markup).toContain("Back to MovieGraph");
        expect(markup).not.toContain("Create your account");
    });
});
