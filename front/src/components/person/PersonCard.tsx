import { Person } from "../../types/person";

export default function PersonCard({ person }: { person: Person }) {
    const roles = person.role?.split(",").map(r => r.trim()) ?? [];

    const isDirector = roles.includes("DIRECTOR");
    const isActor = roles.includes("ACTOR") && !!person.character;

    return (
        <div className="w-[100px] shrink-0 text-center group transition-transform duration-200 ease-out hover:scale-96">
            <img
                src={person.photo_url}
                alt={person.name}
                className="w-[100px] h-[100px] object-cover rounded-full mx-auto shadow-md group-hover:shadow-lg transition-shadow duration-200"
            />
            <p className="mt-2 text-xs text-white font-medium truncate group-hover:text-purple-300 transition-colors duration-200">
                {person.name}
            </p>

            {(isDirector || isActor) && (
                <p className="text-[10px] text-white/60 truncate">
                    {isDirector && "Director"}
                    {isDirector && isActor && " / "}
                    {isActor && <em>as {person.character}</em>}
                </p>
            )}
        </div>
    );
}