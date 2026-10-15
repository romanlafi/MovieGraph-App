import {useMemo} from "react";
import type {Person} from "@/types/person.ts";
import PersonCarousel from "@/components/person/PersonCarousel.tsx";
import {castAndCrew} from "@/data/carouselCategories.ts";

export default function MovieCastSection({cast}: {cast: Person[]}) {
    const people = useMemo(() => [...cast].sort((left, right) => {
        const isDirector = (person: Person) => person.role?.split(",").some(role => role.trim() === "DIRECTOR") ?? false;
        return Number(isDirector(right)) - Number(isDirector(left));
    }), [cast]);

    return <PersonCarousel people={people} title={castAndCrew.title} subtitle={castAndCrew.subtitle} />;
}
