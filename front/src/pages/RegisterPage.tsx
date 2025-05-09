import RegisterForm from "../components/auth/RegisterForm.tsx";
import Container from "../components/common/Container.tsx";

export default function RegisterPage() {
    return (
        <Container className="space-y-10 pb-10 mt-10">
            <RegisterForm />
        </Container>
    );
}