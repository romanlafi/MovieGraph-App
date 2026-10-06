import {useEffect, useState} from "react";
import {Person} from "../../types/person.ts";
import {Movie} from "../../types/movie.ts";
import {getPersonFilmography, getPersonByTmdbId, getRelatedPeople} from "../../services/peopleService.ts";

export function usePersonDetail(tmdbPersonId?: string) {
    const [person, setPerson] = useState<Person | null>(null);
    const [acted, setActed] = useState<Movie[]>([]);
    const [directed, setDirected] = useState<Movie[]>([]);
    const [relatedPeople, setRelatedPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const fetch = async () => {
            if (!tmdbPersonId) return;

            try {
                setLoading(true);
                setActed([]);
                setDirected([]);
                setRelatedPeople([]);
                const personData = await getPersonByTmdbId(tmdbPersonId);
                if (!active) return;

                setPerson(personData);
                const [filmography, relatedRes] = await Promise.allSettled([
                    getPersonFilmography(personData.tmdb_id),
                    getRelatedPeople(personData.tmdb_id),
                ]);

                if (!active) return;
                setActed(filmography.status === "fulfilled" ? filmography.value.acted : []);
                setDirected(filmography.status === "fulfilled" ? filmography.value.directed : []);
                setRelatedPeople(relatedRes.status === "fulfilled" ? relatedRes.value : []);
            } catch (err) {
                console.error("Failed to load person detail", err);
                if (active) setPerson(null);
            } finally {
                if (active) setLoading(false);
            }
        };

        void fetch();
        return () => { active = false; };
    }, [tmdbPersonId]);

    return { person, acted, directed, relatedPeople, loading };
}
