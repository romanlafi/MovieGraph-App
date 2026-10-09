import {FormEvent, useCallback, useEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {FaSearch, FaUsers} from "react-icons/fa";
import Container from "../../components/layout/Container.tsx";
import TextInput from "../../components/ui/inputs/TextInput.tsx";
import Button from "../../components/ui/Button.tsx";
import {User} from "../../types/user.ts";
import {getMyFollowers, getMyFollowing, searchUsers} from "../../services/followService.ts";
import UserCard from "../../components/user/UserCard.tsx";
import {useAuth} from "../../hooks/auth/useAuth.ts";

export default function SocialPage() {
    const {token, user, isLoading, retrySession} = useAuth();
    const [query, setQuery] = useState("");
    const [searchedQuery, setSearchedQuery] = useState("");
    const [results, setResults] = useState<User[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [followers, setFollowers] = useState<User[]>([]);
    const [following, setFollowing] = useState<User[]>([]);
    const [networkLoading, setNetworkLoading] = useState(true);
    const [networkError, setNetworkError] = useState("");
    const [networkView, setNetworkView] = useState<"following" | "followers">("following");
    const networkRequest = useRef(0);
    const searchRequest = useRef(0);
    const searchPending = useRef(false);
    const signedIn = Boolean(token && user);

    const refreshFollows = useCallback(async () => {
        const currentRequest = ++networkRequest.current;
        if (!token || !signedIn) return;
        setNetworkLoading(true);
        setNetworkError("");
        try {
            const [followersData, followingData] = await Promise.all([
                getMyFollowers(),
                getMyFollowing(),
            ]);
            if (currentRequest !== networkRequest.current) return;
            setFollowers(followersData);
            setFollowing(followingData);
        } catch {
            if (currentRequest === networkRequest.current) {
                setNetworkError("Couldn't load your network. Please try again.");
            }
        } finally {
            if (currentRequest === networkRequest.current) setNetworkLoading(false);
        }
    }, [token, signedIn]);

    useEffect(() => {
        setFollowers([]);
        setFollowing([]);
        setResults([]);
        setSearchedQuery("");
        setSearchError("");
        setSearching(false);
        searchPending.current = false;
        void refreshFollows();
        return () => {
            networkRequest.current += 1;
            searchRequest.current += 1;
        };
    }, [refreshFollows]);

    const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedQuery = query.trim();
        if (!signedIn || searchPending.current) return;
        if (trimmedQuery.length < 2) {
            setSearchError("Enter at least two characters to search.");
            return;
        }
        const currentRequest = ++searchRequest.current;
        searchPending.current = true;
        setSearching(true);
        setSearchError("");
        setResults([]);
        setSearchedQuery("");
        try {
            const users = await searchUsers(trimmedQuery);
            if (currentRequest !== searchRequest.current) return;
            setResults(users);
            setSearchedQuery(trimmedQuery);
        } catch {
            if (currentRequest === searchRequest.current) {
                setSearchError("Couldn't search for people. Please try again.");
            }
        } finally {
            if (currentRequest === searchRequest.current) {
                setSearching(false);
                searchPending.current = false;
            }
        }
    };

    const networkUsers = networkView === "following" ? following : followers;
    const userGrid = (users: User[]) => (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {users.map(member => (
                <UserCard key={member.id || member.email} user={member} className="min-w-0" onFollowChange={refreshFollows} />
            ))}
        </div>
    );

    return (
        <Container className="mt-10 space-y-6 pb-10">
            {!signedIn ? (
                <section className="rounded-xl bg-panel p-6 sm:p-8">
                    <FaUsers aria-hidden="true" className="mb-4 text-2xl text-accent" />
                    <h2 className="text-lg font-semibold text-ink">{token ? "Restoring your session" : "Your movie circle starts here"}</h2>
                    <p role="status" className="mt-2 text-sm text-muted">
                        {token ? isLoading ? "Getting your account ready…" : "We couldn't restore your session. Try again to load your network."
                            : "Sign in from the header to find people and follow their movie picks."}
                    </p>
                    {token && !isLoading && <Button onClick={retrySession} className="mt-4 min-h-11">Try again</Button>}
                    {!token && <Link to="/register" className="mt-4 inline-block rounded text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">Create an account</Link>}
                </section>
            ) : (
                <>
                    <section aria-labelledby="find-people-title" className="space-y-5 rounded-xl bg-panel p-5 sm:p-6">
                        <div>
                            <h2 id="find-people-title" className="text-lg font-semibold text-ink">Find people</h2>
                            <p id="people-search-help" className="mt-1 text-sm text-muted">Search by username or email. At least two characters.</p>
                        </div>
                        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <TextInput
                                id="people-search"
                                name="query"
                                type="search"
                                label="Username or email"
                                placeholder="Find someone…"
                                value={query}
                                minLength={2}
                                required
                                autoCapitalize="none"
                                spellCheck={false}
                                aria-describedby="people-search-help"
                                className="!bg-card !text-base min-h-11"
                                onChange={event => {
                                    searchRequest.current += 1;
                                    searchPending.current = false;
                                    setQuery(event.target.value);
                                    setSearching(false);
                                    setResults([]);
                                    setSearchedQuery("");
                                    setSearchError("");
                                }}
                            />
                            <Button type="submit" disabled={searching} className="inline-flex min-h-11 items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                                <FaSearch aria-hidden="true" />{searching ? "Searching…" : "Search"}
                            </Button>
                        </form>
                        {searchError && <p role="alert" className="text-sm text-red-300">{searchError}</p>}
                        <p role="status" className="text-sm text-muted">
                            {searching ? "Looking for people…" : searchedQuery
                                ? results.length > 0 ? `${results.length} ${results.length === 1 ? "person" : "people"} found for “${searchedQuery}”`
                                    : `No people found for “${searchedQuery}”. Try another username or email.`
                                : "Find a friend or someone who shares your taste in movies."}
                        </p>
                        {results.length > 0 && userGrid(results)}
                    </section>

                    <section aria-labelledby="network-title" className="space-y-5 rounded-xl bg-panel p-5 sm:p-6">
                        <h2 id="network-title" className="text-lg font-semibold text-ink">Your movie circle</h2>
                        <div role="group" className="flex flex-wrap gap-2" aria-label="Choose a network list">
                            {(["following", "followers"] as const).map(view => (
                                <button key={view} type="button" aria-pressed={networkView === view} onClick={() => setNetworkView(view)}
                                    className={`inline-flex min-h-11 items-center gap-3 rounded-md px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${networkView === view ? "bg-accent/15 text-accent" : "text-muted hover:bg-card hover:text-ink"}`}>
                                    {view === "following" ? "Following" : "Followers"}
                                    <span className="rounded bg-card px-2 py-0.5 text-xs text-ink">{networkLoading || networkError ? "—" : view === "following" ? following.length : followers.length}</span>
                                </button>
                            ))}
                        </div>
                        {networkLoading ? (
                            <p role="status" className="py-8 text-center text-sm text-muted">Loading your network…</p>
                        ) : networkError ? (
                            <div className="rounded-lg bg-card p-5">
                                <p role="alert" className="text-sm text-muted">{networkError}</p>
                                <Button onClick={() => void refreshFollows()} variant="secondary" className="mt-3 min-h-11">Try again</Button>
                            </div>
                        ) : networkUsers.length > 0 ? userGrid(networkUsers) : (
                            <div className="rounded-lg border border-dashed border-border px-5 py-8 text-center">
                                <FaUsers aria-hidden="true" className="mx-auto mb-3 text-2xl text-muted" />
                                <p className="font-semibold text-ink">{networkView === "following" ? "No follows yet" : "No followers yet"}</p>
                                <p className="mt-2 text-sm text-muted">{networkView === "following" ? "Search for someone above and follow them to start your circle." : "When someone follows you, they'll appear here."}</p>
                            </div>
                        )}
                    </section>
                </>
            )}
        </Container>
    );
}
