import {Link} from "react-router-dom";
import type {ReactNode} from "react";
import {FaUsers} from "react-icons/fa";
import Button from "@/components/ui/Button.tsx";
import UserGrid from "./UserGrid.tsx";
import type {useUserNetwork} from "@/hooks/user/useUserNetwork.ts";

interface Props {
    network: ReturnType<typeof useUserNetwork>;
}

export default function ProfileNetworkSection({network}: Readonly<Props>) {
    const {followers, following, loading: networkLoading, refresh: refreshNetwork} = network;
    const networkError = network.error ? "Couldn't load your network. Your profile is still available." : "";
    const lists = [
        {title: "Following", users: following, empty: "You're not following anyone yet.", help: "Find people who share your taste in movies."},
        {title: "Followers", users: followers, empty: "No followers yet.", help: "When someone follows you, they'll appear here."},
    ];
    let networkContent: ReactNode;
    if (networkLoading) {
        networkContent = <output className="block py-6 text-center text-sm text-muted">Loading your network…</output>;
    } else if (networkError) {
        networkContent = (
            <div className="rounded-lg bg-card p-5">
                <p role="alert" className="text-sm text-muted">{networkError}</p>
                <Button onClick={refreshNetwork} variant="secondary" className="mt-3 min-h-11">Try again</Button>
            </div>
        );
    } else {
        networkContent = (
            <div className="space-y-6">
                {lists.map(list => (
                    <div key={list.title}>
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                            {list.title}<span className="rounded bg-card px-2 py-0.5 text-xs text-muted">{list.users.length}</span>
                        </h3>
                        {list.users.length > 0 ? (
                            <UserGrid users={list.users} onFollowChange={refreshNetwork} />
                        ) : (
                            <div className="flex items-start gap-3 rounded-lg border border-dashed border-border p-5">
                                <FaUsers aria-hidden="true" className="mt-1 shrink-0 text-muted" />
                                <div>
                                    <p className="text-sm text-ink">{list.empty}</p>
                                    <p className="mt-1 text-sm text-muted">{list.help}</p>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }
    return (
        <section aria-labelledby="profile-network-title" className="space-y-5 rounded-xl bg-panel p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="profile-network-title" className="text-lg font-semibold text-ink">Your movie circle</h2>
                <Link to="/social" className="rounded text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">Find people</Link>
            </div>
            {networkContent}
        </section>
    );
}
