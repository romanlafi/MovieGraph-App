import {Link} from "react-router-dom";
import Title from "../components/ui/Title.tsx";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center h-screen text-ink space-y-6">
            <Title title="404" as="h1" size="xl" color="text-accent" />
            <Title title="Página no encontrada." as="h2" size="md" />
            <Link
                to="/"
                className="mt-4 px-6 py-2 bg-accent hover:bg-accent-hover rounded-lg text-canvas font-semibold transition"
            >
                Volver al Inicio
            </Link>
        </div>
    );
}
