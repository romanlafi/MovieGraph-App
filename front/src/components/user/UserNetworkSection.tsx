import {useState} from "react";
import type {ReactNode} from "react";
import {FaUsers} from "react-icons/fa";
import Button from "@/components/ui/Button.tsx";
import UserGrid from "./UserGrid.tsx";
import type {useUserNetwork} from "@/hooks/user/useUserNetwork.ts";

interface Props {
    network: ReturnType<typeof useUserNetwork>;
}

export default function UserNetworkSection({network}: Props) {
    const {followers, following, loading: networkLoading, refresh: refreshFollows} = network;
    const networkError = network.error ? "Couldn't load your network. Please try again." : "";
    const [networkView, setNetworkView] = useState<"following" | "followers">("following");
    const networkUsers = networkView === "following" ? following : followers;
    const getNetworkCount = (view: "following" | "followers") => {
        if (networkLoading || networkError) return "—";
        return view === "following" ? following.length : followers.length;
    };
    const emptyTitle = networkView === "following" ? "No follows yet" : "No followers yet";
    const emptyDescription = networkView === "following"
        ? "Search for someone above and follow them to start your circle."
        : "When someone follows you, they'll appear here.";
    let networkContent: ReactNode;
    if (networkLoading) {
        networkContent = <output className="block py-8 text-center text-sm text-muted">Loading your network…</output>;
    } else if (networkError) {
        networkContent = (
            <div className="rounded-lg bg-card p-5">
                <p role="alert" className="text-sm text-muted">{networkError}</p>
                <Button onClick={refreshFollows} variant="secondary" className="mt-3 min-h-11">Try again</Button>
            </div>
        );
    } else if (networkUsers.length > 0) {
        networkContent = <UserGrid users={networkUsers} onFollowChange={refreshFollows} />;
    } else {
        networkContent = (
            <div className="rounded-lg border border-dashed border-border px-5 py-8 text-center">
                <FaUsers aria-hidden="true" className="mx-auto mb-3 text-2xl text-muted" />
                <p className="font-semibold text-ink">{emptyTitle}</p>
                <p className="mt-2 text-sm text-muted">{emptyDescription}</p>
            </div>
        );
    }
    return (
        <section aria-labelledby="network-title" className="space-y-5 rounded-xl bg-panel p-5 sm:p-6">
            <h2 id="network-title" className="text-lg font-semibold text-ink">Your movie circle</h2>
            <fieldset className="min-w-0 flex flex-wrap gap-2">
                <legend className="sr-only">Choose a network list</legend>
                {(["following", "followers"] as const).map(view => (
                    <button key={view} type="button" aria-pressed={networkView === view} onClick={() => setNetworkView(view)}
                        className={`inline-flex min-h-11 items-center gap-3 rounded-md px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${networkView === view ? "bg-accent/15 text-accent" : "text-muted hover:bg-card hover:text-ink"}`}>
                        {view === "following" ? "Following" : "Followers"}
                        <span className="rounded bg-card px-2 py-0.5 text-xs text-ink">{getNetworkCount(view)}</span>
                    </button>
                ))}
            </fieldset>
            {networkContent}
        </section>
    );
}
