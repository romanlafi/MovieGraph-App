import { Person } from "../../types/person";
import PersonCard from "./PersonCard";

interface Props {
    title?: string;
    people: Person[];
}

export default function PersonCarousel({ title, people }: Props) {
    if (!people.length) return null;

    return (
        <section className="bg-neutral-800 rounded-xl p-6 shadow space-y-4">
            {title && (
                <h2 className="text-2xl font-bold mb-2">{title}</h2>
            )}
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
