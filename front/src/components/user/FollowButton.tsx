import {useFollow} from "../../contexts/FollowContext.tsx";
import {User} from "../../types/user.ts";
import {useRef, useState} from "react";
import {useAuth} from "../../hooks/auth/useAuth.ts";
import {FaCheck, FaUserPlus} from "react-icons/fa";

export default function FollowButton({ user, onFollowChange }: { user: User; onFollowChange?: () => void }) {
    const { isFollowing, toggleFollow } = useFollow();
    const {user: currentUser, token} = useAuth();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const submitting = useRef(false);
    const following = Boolean(user.email && isFollowing(user.email));

    const handleClick = async () => {
        if (!user.email || submitting.current) return;
        submitting.current = true;
        setPending(true);
        setError("");
        try {
            await toggleFollow(user.email);
            onFollowChange?.();
        } catch {
            setError("Couldn't update this follow. Please try again.");
        } finally {
            submitting.current = false;
            setPending(false);
        }
    };

    if (!user.email || !token || !currentUser || user.email === currentUser.email) return null;

    return (
        <div>
            <button
                type="button"
                onClick={handleClick}
                disabled={pending}
                aria-label={`${following ? "Unfollow" : "Follow"} ${user.username || user.email}`}
                aria-pressed={following}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60 ${
                    following
                        ? "bg-accent/15 text-accent hover:bg-accent/25"
                        : "bg-accent text-canvas hover:bg-accent-hover"
                }`}
            >
                {following ? <FaCheck aria-hidden="true" /> : <FaUserPlus aria-hidden="true" />}
                {pending ? "Updating…" : following ? "Following" : "Follow"}
            </button>
            {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
        </div>
    );
}
