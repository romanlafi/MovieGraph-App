import {Link} from "react-router-dom";
import Title from "../components/ui/Title.tsx";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center h-screen text-white space-y-6">
            <Title title="404" as="h1" size="xl" color="text-purple-400" />
            <Title title="Página no encontrada." as="h2" size="md" />
            <Link
                to="/"
                className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold transition"
            >
                Volver al Inicio
            </Link>
        </div>
    );
}