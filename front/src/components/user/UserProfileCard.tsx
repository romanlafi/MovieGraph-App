import {User} from "../../types/user.ts";
import {useAuth} from "../../hooks/auth/useAuth.ts";
import Button from "../ui/Button.tsx";
import FollowButton from "./FollowButton.tsx";
import Title from "../ui/Title.tsx";
import Text from "../ui/Text.tsx";

export default function UserProfileCard({ user }: { user: User }) {
    const { user: authUser } = useAuth();
    const isCurrentUser = authUser?.email === user.email;

    return (
        <div className="bg-neutral-800 p-6 rounded-xl shadow text-white space-y-3">
            <Title title={user.username} size="md" />
            <Text text={user.email} size="sm" color="white/60" />
            <Text  text={user.bio} color="white/70" size="base" />

            {isCurrentUser ? (
                <Button>
                    Edit Profile
                </Button>
            ) : (
                <FollowButton user={user} />
            )}
        </div>
    );
}