import type {Person} from "@/types/person";
import PersonCard from "./PersonCard";
import Title from "@/components/ui/Title.tsx";
import Text from "@/components/ui/Text.tsx";
import HorizontalScroller from "@/components/layout/HorizontalScroller.tsx";

interface Props {
    title?: string;
    subtitle?: string;
    people: Person[];
    showRoles?: boolean;
}

export default function PersonCarousel({ title, subtitle, people, showRoles = true }: Props) {
    if (!people.length) return null;

    return (
        <section className="bg-panel rounded-xl p-6 shadow space-y-4">
            <Title title={title} as="h2" size="md"/>
            <Text text={subtitle} color="white/70"/>
            <HorizontalScroller>
                {people.map((person) => (
                    <div key={person.tmdbId} className="snap-start shrink-0">
                        <PersonCard person={person} showRole={showRoles} />
                    </div>
                ))}
            </HorizontalScroller>
        </section>
    );
}
