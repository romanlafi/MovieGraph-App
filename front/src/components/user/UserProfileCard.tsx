import {FaSignOutAlt} from "react-icons/fa";
import {User} from "../../types/user.ts";
import {useAuth} from "../../hooks/auth/useAuth.ts";
import Button from "../ui/Button.tsx";
import FollowButton from "./FollowButton.tsx";

interface Props {
    user: User;
    onLogout?: () => void;
}

export default function UserProfileCard({user, onLogout}: Props) {
    const {user: authUser} = useAuth();
    const isCurrentUser = Boolean(authUser?.email && authUser.email === user.email);
    const name = user.username || "MovieGraph member";

    return (
        <section aria-labelledby="profile-name" className="space-y-6 rounded-xl bg-panel p-5 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent/15 text-2xl font-semibold text-accent">
                        {name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{isCurrentUser ? "Your profile" : "MovieGraph member"}</p>
                        <h1 id="profile-name" className="break-words text-2xl font-bold text-ink">{name}</h1>
                        <p className="mt-1 break-all text-sm text-muted">{user.email}</p>
                    </div>
                </div>
                {isCurrentUser ? onLogout && (
                    <Button onClick={onLogout} variant="secondary" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                        <FaSignOutAlt aria-hidden="true" />Log out
                    </Button>
                ) : <FollowButton key={user.email} user={user} />}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-5">
                    <h2 className="mb-3 text-sm font-semibold text-ink">About</h2>
                    <p className="whitespace-pre-line break-words text-sm leading-relaxed text-muted">
                        {user.bio?.trim() || (isCurrentUser ? "You haven't added a bio yet." : "No bio yet.")}
                    </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-5">
                    <h2 className="mb-3 text-sm font-semibold text-ink">Favourite genres</h2>
                    {user.favorite_genres.length > 0 ? (
                        <ul className="flex flex-wrap gap-2">
                            {user.favorite_genres.map(genre => (
                                <li key={genre} className="max-w-full break-words rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">{genre}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted">{isCurrentUser ? "You haven't picked any favourite genres yet." : "No favourite genres yet."}</p>
                    )}
                </div>
            </div>
        </section>
    );
}
