import {useRef, useState} from "react";
import axios from "axios";
import {registerUser} from "@/services/authService.ts";
import {registrationFields, registrationResponseErrors, validateRegistration} from "@/utils/registrationValidation.ts";
import type {RegistrationErrors, RegistrationField, RegistrationValues} from "@/utils/registrationValidation.ts";

type TextField = Exclude<keyof RegistrationValues, "favorite_genres">;
type SubmissionStatus = "idle" | "submitting" | "registered";

export function useRegistrationForm() {
    const [form, setForm] = useState<RegistrationValues>({
        username: "", email: "", password: "", birthdate: "", bio: "", favorite_genres: [],
    });
    const [submission, setSubmission] = useState<{status: SubmissionStatus; error: string | null}>({status: "idle", error: null});
    const submitting = useRef(false);
    const [touched, setTouched] = useState<Partial<Record<RegistrationField, boolean>>>({});
    const [serverErrors, setServerErrors] = useState<RegistrationErrors>({});
    const validationErrors = validateRegistration(form);
    const fieldErrors: RegistrationErrors = {...serverErrors};
    for (const field of registrationFields) {
        if (touched[field] && validationErrors[field]) fieldErrors[field] = validationErrors[field];
    }

    const touchField = (field: RegistrationField) => setTouched(current => ({...current, [field]: true}));
    const clearFieldError = (field: RegistrationField) => {
        setServerErrors(current => ({...current, [field]: undefined}));
        setSubmission(current => ({...current, error: null}));
    };

    const updateField = (field: TextField, value: string) => {
        setForm(current => ({...current, [field]: value}));
        clearFieldError(field);
    };

    const toggleGenre = (genre: string) => {
        setForm(current => ({...current, favorite_genres: current.favorite_genres.includes(genre)
            ? current.favorite_genres.filter(favorite => favorite !== genre)
            : [...current.favorite_genres, genre]}));
        touchField("favorite_genres");
        clearFieldError("favorite_genres");
    };

    const submit = async () => {
        if (submitting.current || submission.status === "registered") return false;
        setTouched(Object.fromEntries(registrationFields.map(field => [field, true])));
        setServerErrors({});
        if (Object.keys(validationErrors).length) {
            setSubmission({status: "idle", error: "Please check the highlighted fields."});
            return false;
        }
        submitting.current = true;
        setSubmission({status: "submitting", error: null});
        try {
            await registerUser({...form, email: form.email.trim()});
            setSubmission({status: "registered", error: null});
            return true;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const responseError = registrationResponseErrors(error.response.data);
                setServerErrors(responseError.fields);
                setSubmission({status: "idle", error: responseError.message});
            } else {
                setSubmission({status: "idle", error: "We couldn't reach the server. Check your connection and try again."});
            }
            return false;
        } finally {
            submitting.current = false;
        }
    };

    return {form, updateField, toggleGenre, touchField, fieldErrors, submit, error: submission.error,
        isSubmitting: submission.status === "submitting", isRegistered: submission.status === "registered"};
}
