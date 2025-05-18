import {useEffect, useState} from "react";
import {getGenres} from "../../services/moviesService.ts";
import * as React from "react";
import {registerUser} from "../../services/authService.ts";
import TextInput from "../ui/inputs/TextInput.tsx";
import Button from "../ui/Button.tsx";
import Textarea from "../ui/inputs/Textarea.tsx";
import Title from "../ui/Title.tsx";
import GenreSelector from "../genre/GenreSelector.tsx";
import {useNavigate} from "react-router-dom";
import {AxiosError} from "axios";

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

    const navigate = useNavigate();

    useEffect(() => {
        getGenres().then(setGenres);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleGenresChange = (genre: string) => {
        setForm((prev) => ({
            ...prev,
            favorite_genres: prev.favorite_genres.includes(genre)
                ? prev.favorite_genres.filter((g) => g !== genre)
                : [...prev.favorite_genres, genre],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await registerUser(form);
            alert("User registered successfully");
            navigate("/");
        } catch (err) {
            if (err instanceof AxiosError) {
                const detail = err.response?.data?.detail;

                const message = detail?.error
                    ? detail.message
                    : "Registration failed";

                alert(message);
            } else {
                alert("An unexpected error occurred");
            }
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-neutral-800 p-6 rounded-xl shadow"
        >
            <div className="max-w-md mx-auto space-y-4 bg-neutral-900 p-6 rounded-xl shadow">
                <div className="flex justify-center mb-6">
                    <img src="/src/assets/logo.svg" alt="Register" className="w-30 h-30" />
                </div>

                <Title title="New user" size="lg"/>

                <TextInput type="text" name="username" placeholder="Username" onChange={handleChange} required/>
                <TextInput type="email" name="email" placeholder="Email" onChange={handleChange} required
                    pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                    onInvalid={(e) => e.currentTarget.setCustomValidity("Please enter a valid email address.")}
                    onInput={(e) => e.currentTarget.setCustomValidity("")}
                />
                <TextInput type="password" name="password" placeholder="Password" onChange={handleChange} required/>
                <TextInput type="date" placeholder="Birth date" name="birthdate" onChange={handleChange} required/>
                <Textarea name="bio" placeholder="Short bio..." onChange={handleChange}/>

                <GenreSelector
                    genres={genres}
                    selected={form.favorite_genres}
                    onToggle={handleGenresChange}
                />

                <div className="flex justify-center mt-10">
                    <Button type="submit">
                        Register
                    </Button>
                </div>
            </div>
        </form>
    );
}