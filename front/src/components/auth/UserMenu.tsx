import {useAuth} from "../../contexts/AuthContext.tsx";

export default function UserMenu() {
    const { token, logout } = useAuth();

    if (!token) return null;

    return (
        <div className="flex items-center gap-2 text-sm text-white">
            <span className="hidden sm:block">Mi Cuenta</span>
            <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 transition text-white font-semibold py-1 px-2 rounded text-xs"
            >
                Logout
            </button>
        </div>
    );
}