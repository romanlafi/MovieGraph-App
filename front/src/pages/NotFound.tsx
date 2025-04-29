import {Link} from "react-router-dom";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center h-screen text-white space-y-6">
            <h1 className="text-5xl font-bold text-purple-400">404</h1>
            <p className="text-xl">Página no encontrada.</p>
            <Link
                to="/"
                className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold transition"
            >
                Volver al Inicio
            </Link>
        </div>
    );
}