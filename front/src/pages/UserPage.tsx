import {useAuth} from "../contexts/AuthContext.tsx";
import {useEffect, useState} from "react";
import {User} from "../types/user.ts";
import LoadingSpinner from "../components/layout/LoadingSpinner.tsx";
import NotFound from "./NotFound.tsx";
import {fetchUser} from "../services/authService.ts";
import ProfileView from "../components/user/ProfileView.tsx";
import Button from "../components/common/Button.tsx";
import {useNavigate} from "react-router-dom";
import Container from "../components/common/Container.tsx";

export default function UserPage() {
    const { token, logout } = useAuth();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    useEffect(() => {
        if (!token) return;
        console.log(fetchUser());
        fetchUser()
            .then(setUser)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [token]);

    if (loading) return <LoadingSpinner />;

    if (!user) return <NotFound />;

    return (
        <Container className="space-y-10 pb-10 mt-10">
            <ProfileView user={user} />
            <Button type="button" onClick={() => {
                logout();
                navigate("/");
            }}>
                Log Out
            </Button>
        </Container>
    );
}