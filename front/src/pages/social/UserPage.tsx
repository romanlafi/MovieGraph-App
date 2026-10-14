import {useNavigate, useParams} from "react-router-dom";
import {useEffect, useState} from "react";
import axios from "axios";
import Container from "../../components/layout/Container.tsx";
import UserProfileCard from "../../components/user/UserProfileCard.tsx";
import {User} from "../../types/user.ts";
import {getUserByEmail, getUserByPublicId} from "../../services/followService.ts";
import {useAuth} from "../../hooks/auth/useAuth.ts";
import Button from "../../components/ui/Button.tsx";
import ProfileNetworkSection from "../../components/user/ProfileNetworkSection.tsx";
import {useUserNetwork} from "../../hooks/user/useUserNetwork.ts";
import NotFound from "../NotFound.tsx";

export default function UserPage() {
    const {publicId: routeIdentifier} = useParams();
    const {user: authUser, token, logout} = useAuth();
    const [profile, setProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [profileError, setProfileError] = useState("");
    const [notFound, setNotFound] = useState(false);
    const [retryAttempt, setRetryAttempt] = useState(0);
    const navigate = useNavigate();
    const routePublicId = routeIdentifier && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(routeIdentifier)
        ? routeIdentifier
        : null;
    const isLegacyEmailLink = Boolean(routeIdentifier && !routePublicId);
    const isCurrentUser = Boolean(token && authUser?.public_id && authUser.public_id === routePublicId);

    const network = useUserNetwork(isCurrentUser);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setProfile(null);
        setProfileError("");
        setNotFound(false);

        const loadProfile = async () => {
            if (!routeIdentifier) {
                setNotFound(true);
                setLoading(false);
                return;
            }
            try {
                const fetchedUser = isLegacyEmailLink
                    ? await getUserByEmail(routeIdentifier, controller.signal)
                    : await getUserByPublicId(routeIdentifier, controller.signal);
                if (controller.signal.aborted) return;
                if (isLegacyEmailLink && fetchedUser.public_id) {
                    navigate(`/user/${encodeURIComponent(fetchedUser.public_id)}`, {replace: true});
                    return;
                }
                setProfile(fetchedUser);
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
    }, [routeIdentifier, isLegacyEmailLink, navigate, retryAttempt]);

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
                    {isCurrentUser && <ProfileNetworkSection network={network} />}
                </>
            )}
        </Container>
    );
}
