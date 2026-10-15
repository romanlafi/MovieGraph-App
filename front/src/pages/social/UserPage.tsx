import {useParams} from "react-router-dom";
import Container from "@/components/layout/Container.tsx";
import UserProfileCard from "@/components/user/UserProfileCard.tsx";
import ProfileNetworkSection from "@/components/user/ProfileNetworkSection.tsx";
import Button from "@/components/ui/Button.tsx";
import {useUserProfile} from "@/hooks/user/useUserProfile.ts";
import {useUserNetwork} from "@/hooks/user/useUserNetwork.ts";
import NotFound from "@/pages/NotFound.tsx";

export default function UserPage() {
    const {publicId} = useParams();
    const {profile, loading, error, notFound, retry, isCurrentUser, logout} = useUserProfile(publicId);
    const network = useUserNetwork(isCurrentUser);

    if (notFound) return <NotFound />;

    return (
        <Container className="mt-10 space-y-6 pb-10">
            {loading ? (
                <div role="status" className="rounded-xl bg-panel p-8 text-center text-sm text-muted">Loading profile…</div>
            ) : error ? (
                <section className="rounded-xl bg-panel p-6">
                    <h1 className="text-xl font-semibold text-ink">Profile unavailable</h1>
                    <p role="alert" className="mt-2 text-sm text-muted">{error}</p>
                    <Button onClick={retry} className="mt-4 min-h-11">Try again</Button>
                </section>
            ) : profile && (
                <>
                    <UserProfileCard user={profile} onLogout={logout} />
                    {isCurrentUser && <ProfileNetworkSection network={network} />}
                </>
            )}
        </Container>
    );
}
