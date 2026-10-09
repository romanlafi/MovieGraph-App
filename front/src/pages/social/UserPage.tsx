import {Link, useNavigate, useParams} from "react-router-dom";
import {useCallback, useEffect, useRef, useState} from "react";
import axios from "axios";
import {FaUsers} from "react-icons/fa";
import Container from "../../components/layout/Container.tsx";
import UserProfileCard from "../../components/user/UserProfileCard.tsx";
import {User} from "../../types/user.ts";
import {getMyFollowers, getMyFollowing, getUserByEmail} from "../../services/followService.ts";
import {useAuth} from "../../hooks/auth/useAuth.ts";
import Button from "../../components/ui/Button.tsx";
import UserCard from "../../components/user/UserCard.tsx";
import NotFound from "../NotFound.tsx";

export default function UserPage() {
    const {email} = useParams();
    const {user: authUser, token, logout} = useAuth();
    const [profile, setProfile] = useState<User | null>(null);
    const [followers, setFollowers] = useState<User[]>([]);
    const [following, setFollowing] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [profileError, setProfileError] = useState("");
    const [notFound, setNotFound] = useState(false);
    const [retryAttempt, setRetryAttempt] = useState(0);
    const [networkLoading, setNetworkLoading] = useState(true);
    const [networkError, setNetworkError] = useState("");
    const networkRequest = useRef(0);
    const navigate = useNavigate();
    const targetEmail = email || authUser?.email;
    const isCurrentUser = Boolean(token && authUser?.email && authUser.email === targetEmail);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setProfile(null);
        setProfileError("");
        setNotFound(false);

        const loadProfile = async () => {
            if (!targetEmail) {
                setNotFound(true);
                setLoading(false);
                return;
            }
            try {
                const fetchedUser = await getUserByEmail(targetEmail, controller.signal);
                if (!controller.signal.aborted) setProfile(fetchedUser);
            } catch (error) {
                if (controller.signal.aborted) return;
                if (axios.isAxiosError(error) && error.response?.status === 404) {
                    setNotFound(true);
                } else {
                    setProfileError("Couldn't load this profile. Please try again.");
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        void loadProfile();
        return () => controller.abort();
    }, [targetEmail, retryAttempt]);

    const refreshNetwork = useCallback(async () => {
        const currentRequest = ++networkRequest.current;
        if (!token || !isCurrentUser) return;
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
                setNetworkError("Couldn't load your network. Your profile is still available.");
            }
        } finally {
            if (currentRequest === networkRequest.current) setNetworkLoading(false);
        }
    }, [token, isCurrentUser]);

    useEffect(() => {
        setFollowers([]);
        setFollowing([]);
        void refreshNetwork();
        return () => { networkRequest.current += 1; };
    }, [refreshNetwork]);

    if (!loading && notFound) return <NotFound />;

    return (
        <Container className="mt-10 space-y-6 pb-10">
            {loading ? (
                <div role="status" className="rounded-xl bg-panel p-8 text-center text-sm text-muted">Loading profile…</div>
            ) : profileError ? (
                <section className="rounded-xl bg-panel p-6">
                    <h1 className="text-xl font-semibold text-ink">Profile unavailable</h1>
                    <p role="alert" className="mt-2 text-sm text-muted">{profileError}</p>
                    <Button onClick={() => setRetryAttempt(attempt => attempt + 1)} className="mt-4 min-h-11">Try again</Button>
                </section>
            ) : profile && (
                <>
                    <UserProfileCard user={profile} onLogout={() => {
                        logout();
                        navigate("/");
                    }} />
                    {isCurrentUser && (
                        <section aria-labelledby="profile-network-title" className="space-y-5 rounded-xl bg-panel p-5 sm:p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 id="profile-network-title" className="text-lg font-semibold text-ink">Your movie circle</h2>
                                <Link to="/social" className="rounded text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">Find people</Link>
                            </div>
                            {networkLoading ? (
                                <p role="status" className="py-6 text-center text-sm text-muted">Loading your network…</p>
                            ) : networkError ? (
                                <div className="rounded-lg bg-card p-5">
                                    <p role="alert" className="text-sm text-muted">{networkError}</p>
                                    <Button onClick={() => void refreshNetwork()} variant="secondary" className="mt-3 min-h-11">Try again</Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {[
                                        {title: "Following", users: following, empty: "You're not following anyone yet.", help: "Find people who share your taste in movies."},
                                        {title: "Followers", users: followers, empty: "No followers yet.", help: "When someone follows you, they'll appear here."},
                                    ].map(list => (
                                        <div key={list.title}>
                                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                                                {list.title}<span className="rounded bg-card px-2 py-0.5 text-xs text-muted">{list.users.length}</span>
                                            </h3>
                                            {list.users.length > 0 ? (
                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                    {list.users.map(member => (
                                                        <UserCard key={member.id || member.email} user={member} className="min-w-0" onFollowChange={refreshNetwork} />
                                                    ))}
                                                </div>
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
                            )}
                        </section>
                    )}
                </>
            )}
        </Container>
    );
}
