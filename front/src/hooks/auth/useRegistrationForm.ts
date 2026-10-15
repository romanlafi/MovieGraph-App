import {useRef, useState} from "react";
import axios from "axios";
import {registerUser} from "../../services/authService.ts";
import type {RegisterUserData} from "../../types/auth.ts";

type RegistrationValues = Required<RegisterUserData>;
type TextField = Exclude<keyof RegistrationValues, "favorite_genres">;
type SubmissionStatus = "idle" | "submitting" | "registered";

function registrationErrorMessage(error: unknown): string {
    if (!axios.isAxiosError(error)) return "We couldn't reach the server. Check your connection and try again.";
    const data: unknown = error.response?.data;
    if (data && typeof data === "object" && "detail" in data) {
        const detail = data.detail;
        if (typeof detail === "string") return detail;
        if (detail && typeof detail === "object" && "message" in detail && typeof detail.message === "string") {
            return detail.message;
        }
    }
    return "We couldn't create your account. Please try again.";
}

export function useRegistrationForm() {
    const [form, setForm] = useState<RegistrationValues>({
        username: "", email: "", password: "", birthdate: "", bio: "", favorite_genres: [],
    });
    const [submission, setSubmission] = useState<{status: SubmissionStatus; error: string | null}>({status: "idle", error: null});
    const submitting = useRef(false);

    const updateField = (field: TextField, value: string) => {
        setForm(current => ({...current, [field]: value}));
    };

    const toggleGenre = (genre: string) => {
        setForm(current => ({...current, favorite_genres: current.favorite_genres.includes(genre)
            ? current.favorite_genres.filter(favorite => favorite !== genre)
            : [...current.favorite_genres, genre]}));
    };

    const submit = async () => {
        if (submitting.current || submission.status === "registered") return;
        submitting.current = true;
        setSubmission({status: "submitting", error: null});
        try {
            await registerUser(form);
            setSubmission({status: "registered", error: null});
        } catch (error) {
            setSubmission({status: "idle", error: registrationErrorMessage(error)});
        } finally {
            submitting.current = false;
        }
    };

    return {form, updateField, toggleGenre, submit, error: submission.error,
        isSubmitting: submission.status === "submitting", isRegistered: submission.status === "registered"};
}
