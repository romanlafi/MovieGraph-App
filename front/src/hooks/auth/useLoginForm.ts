import {useRef, useState} from "react";
import axios from "axios";
import {loginUser} from "../../services/authService.ts";
import {useAuth} from "./useAuth.ts";

export function useLoginForm(onSuccess: () => void) {
    const {login} = useAuth();
    const [credentials, setCredentials] = useState({email: "", password: ""});
    const [submission, setSubmission] = useState({pending: false, error: ""});
    const submitting = useRef(false);

    const updateField = (field: keyof typeof credentials, value: string) => {
        setCredentials(current => ({...current, [field]: value}));
    };

    const submit = async () => {
        if (submitting.current) return;
        submitting.current = true;
        setSubmission({pending: true, error: ""});
        try {
            const token = await loginUser(credentials.email, credentials.password);
            login(token);
            onSuccess();
        } catch (error) {
            setSubmission({pending: false, error: axios.isAxiosError(error) && error.response?.status === 401
                ? "Wrong email or password"
                : "Login is temporarily unavailable. Please try again."});
        } finally {
            submitting.current = false;
            setSubmission(current => ({...current, pending: false}));
        }
    };

    return {credentials, updateField, submit, isSubmitting: submission.pending, error: submission.error};
}
