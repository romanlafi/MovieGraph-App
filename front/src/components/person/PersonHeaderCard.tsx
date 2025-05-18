import {getTmdbImageUrl} from "../../utils/tmdbImageHelper.ts";
import {Person} from "../../types/person.ts";
import {FaBirthdayCake, FaMapMarkerAlt} from "react-icons/fa";
import Title from "../ui/Title.tsx";
import Text from "../ui/Text.tsx";

export default function PersonHeaderCard({ person }: { person: Person }) {
    return (
        <section className="bg-neutral-800 rounded-xl p-6 shadow space-y-4">
            <div className="flex flex-col lg:flex-row gap-6 justify-center items-start mt-2">
                <div className="w-full max-w-xs mx-auto lg:mx-0 h-[420px] flex items-center justify-center rounded overflow-hidden">
                    <img
                        src={getTmdbImageUrl(person.photo_url, "original")}
                        alt={person.name}
                        className="h-full w-auto rounded"
                    />
                </div>

                <div className="flex-1 h-[420px] overflow-hidden space-y-4 text-white">
                    <Title title={person.name} as="h1" size="lg"/>

                    <div className="space-y-1">
                        <Text className="flex items-center gap-2" color="white/80">
                            <FaBirthdayCake className="text-purple-400" /> {person.birthday}
                        </Text>
                        <Text className="flex items-center gap-2" color="white/80">
                            <FaMapMarkerAlt className="text-purple-400" /> {person.place_of_birth}
                        </Text>
                    </div>

                    <Text
                        text={person.biography}
                        color="white/70"
                        size="base"
                        className="overflow-y-auto pr-2 leading-relaxed whitespace-pre-line h-[180px] lg:h-[calc(100%-100px)]"
                    />
                </div>
            </div>
        </section>
    );
}