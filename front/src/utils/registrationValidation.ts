import type {RegisterUserData} from "../types/auth.ts";

export type RegistrationValues = Required<RegisterUserData>;
export type RegistrationField = keyof RegistrationValues;
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

export const registrationFields: RegistrationField[] = ["username", "email", "password", "birthdate", "bio", "favorite_genres"];
export const PASSWORD_MIN_LENGTH = 12;
export const MAX_FAVORITE_GENRES = 20;

export function todayDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function isValidEmail(email: string): boolean {
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    const [local, domain] = email.split("@");
    return local.length <= 64 && !local.startsWith(".") && !local.endsWith(".") && !local.includes("..")
        && !/[<>()[\]\\,;:"]/.test(local)
        && domain.split(".").every(label => /^[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?$/u.test(label));
}

export function validateRegistration(values: RegistrationValues): RegistrationErrors {
    const errors: RegistrationErrors = {};
    const usernameLength = Array.from(values.username).length;
    if (!values.username.trim()) errors.username = "Enter a username.";
    else if (usernameLength < 2 || usernameLength > 40) errors.username = "Username must contain between 2 and 40 characters.";

    const email = values.email.trim();
    if (!email) errors.email = "Enter your email address.";
    else if (!isValidEmail(email)) errors.email = "Enter a valid email address, such as you@example.com.";

    if (Array.from(values.password).length < PASSWORD_MIN_LENGTH) errors.password = "Password must contain at least 12 characters.";
    else if (new TextEncoder().encode(values.password).length > 72) errors.password = "Password is too long. Use fewer characters; emoji and accented letters take more space.";

    if (!values.birthdate) errors.birthdate = "Enter your date of birth.";
    else {
        const parsed = new Date(`${values.birthdate}T00:00:00Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(values.birthdate) || Number.isNaN(parsed.getTime())
            || parsed.toISOString().slice(0, 10) !== values.birthdate || values.birthdate.startsWith("0000")) {
            errors.birthdate = "Enter a valid date of birth.";
        } else if (values.birthdate > todayDate()) errors.birthdate = "Date of birth cannot be in the future.";
    }

    if (Array.from(values.bio).length > 500) errors.bio = "Bio must contain no more than 500 characters.";
    if (values.favorite_genres.length > MAX_FAVORITE_GENRES) errors.favorite_genres = "Select no more than 20 favorite genres.";
    else if (values.favorite_genres.some(genre => !genre.trim() || Array.from(genre).length > 40)) {
        errors.favorite_genres = "Choose valid genres from the list.";
    }
    return errors;
}

const serverFieldMessages: Record<RegistrationField, string> = {
    username: "Username must contain between 2 and 40 characters.",
    email: "Enter a valid email address, such as you@example.com.",
    password: "Use at least 12 characters and no more than 72 bytes for your password. Emoji and accented letters take more space.",
    birthdate: "Enter a valid date of birth.",
    bio: "Bio must contain no more than 500 characters.",
    favorite_genres: "Select up to 20 valid genres from the list.",
};

export function registrationResponseErrors(data: unknown): {fields: RegistrationErrors; message: string} {
    const fields: RegistrationErrors = {};
    if (data && typeof data === "object" && "detail" in data) {
        const detail: unknown = data.detail;
        if (Array.isArray(detail)) {
            for (const issue of detail) {
                if (!issue || typeof issue !== "object" || !Array.isArray(issue.loc)) continue;
                const field = issue.loc[0] === "body" ? issue.loc[1] : undefined;
                if (registrationFields.includes(field)) fields[field as RegistrationField] = serverFieldMessages[field as RegistrationField];
            }
            return {fields, message: Object.keys(fields).length
                ? "Please check the highlighted fields and try again."
                : "We couldn't validate your account details. Check the form and try again."};
        }
        if (detail && typeof detail === "object" && "error" in detail) {
            if (detail.error === "email_conflict") fields.email = "This email is already registered. Sign in or use another email.";
            if (detail.error === "user_conflict") fields.username = "This username is already taken. Choose another one.";
        }
        if (typeof detail === "string") return {fields, message: detail};
        if (detail && typeof detail === "object" && "message" in detail && typeof detail.message === "string") {
            return {fields, message: detail.message};
        }
    }
    return {fields, message: "We couldn't create your account. Please try again."};
}
