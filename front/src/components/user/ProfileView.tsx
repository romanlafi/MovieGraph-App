import {User} from "../../types/user.ts";
import {FaUserCircle} from "react-icons/fa";
import {useEffect, useState} from "react";
import {Genre} from "../../types/genre.ts";
import {getGenres} from "../../services/moviesService.ts";
import GenreSelector from "../genre/GenreSelector.tsx";

export default function ProfileView({ user }: { user: User }) {
    const [allGenres, setAllGenres] = useState<Genre[]>([]);

    useEffect(() => {
        getGenres().then(setAllGenres).catch(console.error);
    }, []);

    return (
        <section className="max-w-md mx-auto space-y-4 bg-neutral-800 p-6 rounded-xl shadow">

            <div className="flex justify-center">
                <FaUserCircle className="text-purple-800 text-8xl mb-2" />
            </div>

            <h2 className="text-2xl font-bold">Your Profile</h2>

            <div>
                <p className="text-sm text-white/70">Username:</p>
                <p>{user.username}</p>
            </div>

            <div>
                <p className="text-sm text-white/70">Email:</p>
                <p>{user.email}</p>
            </div>

            <div>
                <p className="text-sm text-white/70">Birthdate:</p>
                <p>{user.birthdate}</p>
            </div>

            {user.bio && (
                <div>
                    <p className="text-sm text-white/70">Bio:</p>
                    <p>{user.bio}</p>
                </div>
            )}

            <GenreSelector
                genres={allGenres}
                selected={user.favorite_genres.map(genre => genre)}
                onToggle={() => {}}
            />
        </section>
    );
}