import {useNavigate, useParams} from "react-router-dom";
import {useEffect, useState} from "react";

import Container from "../../components/layout/Container.tsx";
import UserProfileCard from "../../components/user/UserProfileCard.tsx";
import {User} from "../../types/user.ts";
import {getMyFollowers, getMyFollowing, getUserByEmail} from "../../services/followService.ts";
import LoadingSpinner from "../../components/layout/LoadingSpinner.tsx";
import {useAuth} from "../../hooks/auth/useAuth.ts";
import Button from "../../components/ui/Button.tsx";
import Title from "../../components/ui/Title.tsx";
import UserCard from "../../components/user/UserCard.tsx";
import NotFound from "../NotFound.tsx";


export default function UserPage() {
    const { email } = useParams();
    const { user: authUser, logout } = useAuth();
    const [user, setUser] = useState<User | null>(null);
    const [followers, setFollowers] = useState<User[]>([]);
    const [following, setFollowing] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const targetEmail = email || authUser?.email;
                if (!targetEmail) return;

                const fetchedUser = await getUserByEmail(targetEmail);
                setUser(fetchedUser);

                if (authUser?.email === targetEmail) {
                    const [foll, ing] = await Promise.all([
                        getMyFollowers(),
                        getMyFollowing(),
                    ]);
                    setFollowers(foll);
                    setFollowing(ing);
                }
            } catch (error) {
                console.error("User not found", error);
            } finally {
                setLoading(false);
            }
        };

        void fetchUser();
    }, [email, authUser]);

    if (loading) return <LoadingSpinner />;
    if (!user) return <NotFound />;

    return (
        <Container className="space-y-10 mt-10">
            <UserProfileCard user={user}/>

            {followers.length > 0 && (
                <div>
                    <Title title="Followers" size="md" className="mb-2"/>
                    <div className="flex overflow-x-auto gap-4 pb-2">
                        {followers.map((u) => (
                            <UserCard key={u.id} user={u} linkToProfile={false} />
                        ))}
                    </div>
                </div>
            )}

            {following.length > 0 && (
                <div>
                    <Title title="Following" size="md" className="mb-2"/>
                    <div className="flex overflow-x-auto gap-4 pb-2">
                        {following.map((u) => (
                            <UserCard key={u.id} user={u} linkToProfile={false} />
                        ))}
                    </div>
                </div>
            )}

            {authUser?.email === user.email && (
                <div className="flex justify-center">
                    <Button
                        onClick={() => {
                            logout();
                            navigate("/");
                        }}
                    >
                        Log out
                    </Button>
                </div>
            )}
        </Container>
    );
}