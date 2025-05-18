import {useEffect, useState} from "react";
import {Person} from "../../types/person.ts";
import {Movie} from "../../types/movie.ts";
import {getActedMovies, getDirectedMovies, getPersonByTmdbId, getRelatedPeople} from "../../services/peopleService.ts";

export function usePersonDetail(tmdbId?: string) {
    const [person, setPerson] = useState<Person | null>(null);
    const [acted, setActed] = useState<Movie[]>([]);
    const [directed, setDirected] = useState<Movie[]>([]);
    const [relatedPeople, setRelatedPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            if (!tmdbId) return;

            try {
                setLoading(true);
                const personData = await getPersonByTmdbId(tmdbId);

                if (!personData.id) return;

                const [actedRes, directedRes, relatedRes] = await Promise.all([
                    getActedMovies(personData.id),
                    getDirectedMovies(personData.id),
                    getRelatedPeople(personData.id),
                ]);

                setPerson(personData);
                setActed(actedRes);
                setDirected(directedRes);
                setRelatedPeople(relatedRes);
            } catch (err) {
                console.error("Failed to load person detail", err);
                setPerson(null);
            } finally {
                setLoading(false);
            }
        };

        void fetch();
    }, [tmdbId]);

    return { person, acted, directed, relatedPeople, loading };
}