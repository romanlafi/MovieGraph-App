import {useCallback, useEffect, useRef, useState} from "react";
import Container from "../../components/layout/Container.tsx";
import LoadingSpinner from "../../components/layout/LoadingSpinner.tsx";
import TextInput from "../../components/ui/inputs/TextInput.tsx";
import Button from "../../components/ui/Button.tsx";
import Title from "../../components/ui/Title.tsx";
import {User} from "../../types/user.ts";
import FollowButton from "../../components/user/FollowButton.tsx";
import {getMyFollowers, getMyFollowing, searchUsers} from "../../services/followService.ts";
import UserCard from "../../components/user/UserCard.tsx";
import Text from "../../components/ui/Text.tsx";
import {useAuth} from "../../hooks/auth/useAuth.ts";

export default function SocialPage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [followers, setFollowers] = useState<User[]>([]);
    const [following, setFollowing] = useState<User[]>([]);
    const { token } = useAuth();
    const requestId = useRef(0);

    const refreshFollows = useCallback(async () => {
        const currentRequestId = ++requestId.current;
        if (!token) {
            setFollowers([]);
            setFollowing([]);
            return;
        }
        try {
            const [followersData, followingData] = await Promise.all([
                getMyFollowers(),
                getMyFollowing(),
            ]);
            if (currentRequestId === requestId.current) {
                setFollowers(followersData);
                setFollowing(followingData);
            }
        } catch (error) {
            console.error("Failed to load follow data", error);
        }
    }, [token]);

    useEffect(() => {
        setFollowers([]);
        setFollowing([]);
        void refreshFollows();
    }, [refreshFollows]);

    const handleSearch = async () => {
        if (query.length < 2) return;
        setLoading(true);
        try {
            const users = await searchUsers(query);
            setResults(users);
        } catch (error) {
            console.error("Failed to search users:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="space-y-10 mt-10">
            <Title title="Your Network" />

            {token && followers.length > 0 && (
                <div>
                    <Title title="Your Followers" as="h2" size="sm" className="mb-2"/>
                    <div className="flex overflow-x-auto gap-4 pb-2">
                        {followers.map((u) => (
                            <UserCard key={u.id} user={u} />
                        ))}
                    </div>
                </div>
            )}

            {token && following.length > 0 && (
                <div>
                    <Title title="You're Following" as="h2" size="sm" className="mb-2"/>

                    <div className="flex overflow-x-auto gap-4 pb-2">
                        {following.map((u) => (
                            <UserCard key={u.id} user={u} />
                        ))}
                    </div>
                </div>
            )}

            <Title title="Find People" />

            <div className="flex gap-4 items-center">
                <TextInput
                    placeholder="Search by username or email..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={loading}>
                    Search
                </Button>
            </div>

            {loading && <LoadingSpinner />}

            {!loading && results.length > 0 && (
                <div className="space-y-4">
                    {results.map((user) => (
                        <div
                            key={user.id}
                            className="flex items-center justify-between border-b border-white/10 pb-3"
                        >
                            <div>
                                <Text text={user.username} size="base"/>
                                <Text text={user.email} size="sm" color="white/60" truncate={true}/>
                            </div>
                            <FollowButton user={user} onFollowChange={refreshFollows} />
                        </div>
                    ))}
                </div>
            )}

            {!loading && results.length === 0 && query && (
                <Text text="No users found" size="sm" color="white/60" truncate={true}/>
            )}
        </Container>
    );
}
