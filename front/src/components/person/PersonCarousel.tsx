import { Person } from "../../types/person";
import PersonCard from "./PersonCard";
import Title from "../ui/Title.tsx";
import Text from "../ui/Text.tsx";

interface Props {
    title?: string;
    subtitle?: string;
    people: Person[];
}

export default function PersonCarousel({ title, subtitle, people }: Props) {
    if (!people.length) return null;

    return (
        <section className="bg-neutral-800 rounded-xl p-6 shadow space-y-4">
            <Title title={title} as="h2" size="md"/>
            <Text text={subtitle} color="white/70"/>
            <div className="overflow-x-auto">
                <div className="flex gap-4 pb-4 scroll-smooth snap-x snap-mandatory whitespace-nowrap">
                    {people.map((person) => (
                        <div key={person.tmdb_id} className="snap-start shrink-0">
                            <PersonCard person={person} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
