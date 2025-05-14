import {useNavigate, useParams} from "react-router-dom";
import {useEffect, useState} from "react";

import ProfileView from "../components/user/ProfileView.tsx";
import Button from "../components/common/Button.tsx";
import Container from "../components/common/Container.tsx";
import MovieCarousel from "../components/movie/MovieCarousel.tsx";
import NotFound from "./NotFound.tsx";
import {useLikes} from "../contexts/LikeContext.tsx";
import {useAuth} from "../hooks/useAuth.tsx";
import FriendButton from "../components/common/FriendButton.tsx";
import {fetchUserByEmail} from "../services/friendService.ts";
import UserProfileCard from "../components/user/UserProfileCard.tsx";
import {User} from "../types/user.ts";


export default function UserPage() {
    const { user, logout } = useAuth();
    const { likes } = useLikes();
    const navigate = useNavigate();
    const { email } = useParams<{ email: string }>();
    const [profileUser, setProfileUser] = useState<User | null>(null);

    useEffect(() => {
        if (!email || (user && email === user.email)) {
            setProfileUser(user);
            return;
        }

        fetchUserByEmail(email)
            .then(setProfileUser)
            .catch(console.error);
    }, [email, user]);

    if (!profileUser) return <NotFound />;

    return (
        <Container className="space-y-10 pb-10 mt-10">
            <ProfileView user={profileUser} />
            <UserProfileCard
                user={profileUser}
                isOwnProfile={user?.email === profileUser.email}
                showAddFriend={!!(user && profileUser.email !== user.email)}
            />

            {user && profileUser.email === user.email && (
                <>
                    <MovieCarousel movies={likes} title="Your Favourite Movies" />
                    <div className="flex justify-center items-center">
                        <Button
                            type="button"
                            onClick={() => {
                                logout();
                                navigate("/");
                                window.location.reload();
                            }}
                        >
                            Log Out
                        </Button>
                    </div>
                </>
            )}

            {user && profileUser.email && profileUser.email !== user.email && (
                <div className="flex justify-center items-center">
                    <FriendButton email={profileUser.email} />
                </div>
            )}
        </Container>
    );
}