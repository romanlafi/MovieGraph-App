import type {ReactNode} from "react";
import {FaRedo, FaSignInAlt, FaSpinner, FaUser, FaUsers} from "react-icons/fa";
import {useAuth} from "@/hooks/auth/useAuth.ts";
import NavItem from "./NavItem.tsx";

interface Props {
    loginOpen: boolean;
    onLogin: () => void;
}

export default function HeaderSessionNav({loginOpen, onLogin}: Readonly<Props>) {
    const {token, user, isLoading, retrySession} = useAuth();
    let accountNavigation: ReactNode;
    if (token && user) {
        accountNavigation = (
            <NavItem to={`/user/${encodeURIComponent(user.public_id)}`} ariaLabel="Your profile">
                <span className="flex items-center gap-2"><FaUser aria-hidden="true" className="text-xl" /><span className="hidden max-w-24 truncate xl:inline">{user.username}</span></span>
            </NavItem>
        );
    } else if (token) {
        accountNavigation = (
            <NavItem onClick={retrySession} ariaLabel="Restore session">
                <span className="flex items-center gap-2">{isLoading ? <FaSpinner aria-hidden="true" className="animate-spin" /> : <FaRedo aria-hidden="true" />}<span className="hidden xl:inline">{isLoading ? "Restoring" : "Retry"}</span></span>
            </NavItem>
        );
    } else {
        accountNavigation = (
            <NavItem onClick={onLogin} ariaLabel="Login" ariaExpanded={loginOpen} ariaControls="header-login">
                <span className="flex items-center gap-2"><FaSignInAlt aria-hidden="true" className="text-xl" /><span className="hidden xl:inline">Login</span></span>
            </NavItem>
        );
    }

    return (
        <>
            {token && (
                <NavItem to="/social" ariaLabel="Social">
                    <span className="flex items-center gap-2"><FaUsers aria-hidden="true" className="text-xl" /><span className="hidden xl:inline">Social</span></span>
                </NavItem>
            )}
            {accountNavigation}
        </>
    );
}
