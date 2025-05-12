import NotFound from "./NotFound.tsx";
import ProfileView from "../components/user/ProfileView.tsx";
import Button from "../components/common/Button.tsx";
import {useNavigate} from "react-router-dom";
import Container from "../components/common/Container.tsx";
import {useAuth} from "../hooks/useAuth.tsx";
import MovieCarousel from "../components/movie/MovieCarousel.tsx";
import {useLikes} from "../contexts/LikeContext.tsx";

export default function UserPage() {
    const { user, logout } = useAuth();
    const {likes} = useLikes();
    const navigate = useNavigate();

    if (!user) return <NotFound />;

    return (
        <Container className="space-y-10 pb-10 mt-10">
            <ProfileView user={user} />
            <MovieCarousel movies={likes} title="Favourite movies" />
            <Button type="button" onClick={() => {logout(); navigate("/");}}> Log Out </Button>
        </Container>
    );
}