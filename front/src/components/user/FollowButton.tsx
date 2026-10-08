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
                    ? "bg-accent/15 text-accent hover:bg-accent/25"
                    : "bg-accent text-canvas hover:bg-accent-hover"
            } transition`}
        >
            {isFollowing(user.email) ? "Following ✓" : "Follow"}
        </button>
    );
}
