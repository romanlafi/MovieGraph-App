import Title from "../components/common/Title.tsx";
import {useEffect, useState} from "react";
import {getFriends} from "../services/friendService.ts";
import LoadingSpinner from "../components/layout/LoadingSpinner.tsx";
import Container from "../components/common/Container.tsx";
import FriendsGrid from "../components/user/FriendsGrid.tsx";


export default function FriendsPage() {
    const [friends, setFriends] = useState<[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getFriends()
            .then(setFriends)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner />;

    if (!friends.length) return (
        <Container className="py-10 text-center text-white">
            <p>You have no friends yet 😢</p>
        </Container>
    );

    return (
        <Container className="py-10 space-y-4">
            <Title title="Your Friends" size="md" />
            <FriendsGrid friends={friends} />
        </Container>
    );
}