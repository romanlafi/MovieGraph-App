import {useState} from "react";
import * as React from "react";
import Container from "../components/common/Container.tsx";
import LoadingSpinner from "../components/layout/LoadingSpinner.tsx";
import FriendButton from "../components/common/FriendButton.tsx";
import TextInput from "../components/common/TextInput.tsx";
import {searchUsers} from "../services/friendService.ts";
import Button from "../components/common/Button.tsx";
import Title from "../components/common/Title.tsx";
import {User} from "../types/user.ts";

export default function SocialPage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query) return;

        try {
            setLoading(true);
            const data = await searchUsers(query);
            setResults(data);
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="py-10 space-y-6">
            <Title title="Find new friends" size="md"/>
            <form onSubmit={handleSearch} className="flex gap-2">
                <TextInput
                    type="text"
                    placeholder="Search by username or email..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <Button type="submit">
                    Search
                </Button>
            </form>

            {loading && <LoadingSpinner />}

            {results.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {results.map((user: User) => (
                        <div key={user.id} className="bg-neutral-800 p-4 rounded shadow text-white space-y-2 text-center">
                            <p className="font-semibold">{user.username}</p>
                            <p className="text-sm text-white/60">{user.email}</p>
                            {user.email && <FriendButton email={user.email}/>}
                        </div>
                    ))}
                </div>
            )}
        </Container>
    );
}