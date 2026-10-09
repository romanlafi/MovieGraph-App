import RegisterForm from "../components/auth/RegisterForm.tsx";
import Container from "../components/layout/Container.tsx";

export default function Register() {
    return (
        <Container className="mt-10 pb-10">
            <RegisterForm />
        </Container>
    );
}
