import {useFollow} from "../../contexts/FollowContext.tsx";
import {User} from "../../types/user.ts";

export default function FollowButton({ user, onFollowChange }: { user: User; onFollowChange?: () => void }) {
    const { isFollowing, toggleFollow } = useFollow();

    const handleClick = async () => {
        if (!user.email) return null
        await toggleFollow(user.email);
        onFollowChange?.();
    };

    if (!user.email) return null;

    return (
        <button
            onClick={handleClick}
            className={`px-3 py-1 text-sm rounded ${
                isFollowing(user.email)
                    ? "bg-purple-700 text-white hover:bg-purple-800"
                    : "bg-white text-purple-800 hover:bg-purple-200"
            } transition`}
        >
            {isFollowing(user.email) ? "Following ✓" : "Follow"}
        </button>
    );
}