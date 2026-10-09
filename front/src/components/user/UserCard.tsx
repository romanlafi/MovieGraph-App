import {Link} from "react-router-dom";
import FollowButton from "./FollowButton.tsx";
import {User} from "../../types/user.ts";

interface Props {
    user: User;
    showFollowButton?: boolean;
    linkToProfile?: boolean;
    onFollowChange?: () => void;
    className?: string;
}

export default function UserCard({
                                     user,
                                     showFollowButton = true,
                                     linkToProfile = true,
                                     onFollowChange,
                                     className = "w-56 shrink-0",
                                 }: Props) {
    const name = user.username || "MovieGraph member";
    const profile = (
        <>
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15 text-lg font-semibold text-accent">
                {name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
        </>
    );

    return (
        <article className={`flex flex-col gap-4 rounded-lg border border-border bg-card p-4 ${className}`}>
            {linkToProfile && user.email ? (
                <Link to={`/user/${encodeURIComponent(user.email)}`} className="flex items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent hover:text-accent">
                    {profile}
                </Link>
            ) : (
                <div className="flex items-center gap-3">{profile}</div>
            )}
            <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted">
                {user.bio || "No bio yet."}
            </p>
            {showFollowButton && (
                <div className="mt-auto">
                    <FollowButton user={user} onFollowChange={onFollowChange} />
                </div>
            )}
        </article>
    );
}
