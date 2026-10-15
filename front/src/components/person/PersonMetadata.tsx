import type {Person} from "@/types/person.ts";
import {FaBirthdayCake, FaMapMarkerAlt} from "react-icons/fa";
import Title from "@/components/ui/Title.tsx";
import Text from "@/components/ui/Text.tsx";

export default function PersonMetadata({person}: {person: Person}) {
    return (
        <div className="flex-1 h-[420px] overflow-hidden space-y-4 text-ink">
            <Title title={person.name} as="h1" size="lg"/>
            <div className="space-y-1">
                <Text className="flex items-center gap-2" color="white/80">
                    <FaBirthdayCake className="text-accent" /> {person.birthday}
                </Text>
                <Text className="flex items-center gap-2" color="white/80">
                    <FaMapMarkerAlt className="text-accent" /> {person.place_of_birth}
                </Text>
            </div>
            <Text
                text={person.biography}
                color="white/70"
                size="base"
                className="overflow-y-auto pr-2 leading-relaxed whitespace-pre-line h-[180px] lg:h-[calc(100%-100px)]"
            />
        </div>
    );
}
