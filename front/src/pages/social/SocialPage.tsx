import Container from "@/components/layout/Container.tsx";
import SocialSessionState from "@/components/user/SocialSessionState.tsx";
import UserSearchSection from "@/components/user/UserSearchSection.tsx";
import UserNetworkSection from "@/components/user/UserNetworkSection.tsx";
import {useAuth} from "@/hooks/auth/useAuth.ts";
import {useUserNetwork} from "@/hooks/user/useUserNetwork.ts";

export default function SocialPage() {
    const {token, user} = useAuth();
    const network = useUserNetwork();
    return (
        <Container className="mt-10 space-y-6 pb-10">
            {!token || !user ? <SocialSessionState /> : (
                <>
                    <UserSearchSection key={token} onFollowChange={network.refresh} />
                    <UserNetworkSection network={network} />
                </>
            )}
        </Container>
    );
}
