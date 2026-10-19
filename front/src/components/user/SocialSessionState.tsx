import {Link} from "react-router-dom";
import {FaUsers} from "react-icons/fa";
import Button from "@/components/ui/Button.tsx";
import {useAuth} from "@/hooks/auth/useAuth.ts";

export default function SocialSessionState() {
    const {token, isLoading, retrySession} = useAuth();
    const heading = token ? "Restoring your session" : "Your movie circle starts here";
    let sessionMessage = "Sign in from the header to find people and follow their movie picks.";
    if (token && isLoading) sessionMessage = "Getting your account ready…";
    else if (token) sessionMessage = "We couldn't restore your session. Try again to load your network.";
    return (
        <section className="rounded-xl bg-panel p-6 sm:p-8">
            <FaUsers aria-hidden="true" className="mb-4 text-2xl text-accent" />
            <h2 className="text-lg font-semibold text-ink">{heading}</h2>
            <output className="mt-2 block text-sm text-muted">
                {sessionMessage}
            </output>
            {token && !isLoading && <Button onClick={retrySession} className="mt-4 min-h-11">Try again</Button>}
            {!token && <Link to="/register" className="mt-4 inline-block rounded text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">Create an account</Link>}
        </section>
    );
}
