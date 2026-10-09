import {Person} from "../../types/person";
import {useNavigate} from "react-router-dom";
import Text from "../ui/Text.tsx";
import PersonImage from "./PersonImage.tsx";

export default function PersonCard({person}: { person: Person }) {
    const roles = person.role?.split(",").map(r => r.trim()) ?? [];

    const isDirector = roles.includes("DIRECTOR");
    const isActor = roles.includes("ACTOR") && !!person.character;

    const navigate = useNavigate();

    const handleCardClick = () => {
        navigate(`/person/${person.tmdb_id}`);
    };

    return (
        <div
            onClick={() => handleCardClick()}
            className="w-[100px] shrink-0 text-center group cursor-pointer transition-transform duration-200 ease-out hover:scale-96">
            <PersonImage
                name={person.name}
                photoPath={person.photo_url}
                size="card"
                className="w-[100px] h-[100px] rounded-full overflow-hidden mx-auto shadow-md group-hover:shadow-lg transition-shadow duration-200"
            />
            <Text text={person.name} size="xs" className="mt-2 group-hover:text-accent transition-colors duration-200"/>

            <Text
                className="text-[10px]"
                color="white/60"
                truncate={true}
            >
                {isDirector && "Director"}
                {isDirector && isActor && " / "}
                {isActor && <em>as {person.character}</em>}
            </Text>
        </div>
    );
}
