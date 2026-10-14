import {useEffect, useRef, useState} from "react";
import {Movie} from "../types/movie.ts";
import {Person} from "../types/person.ts";
import {Collection} from "../types/collection.ts";
import {
    getLatestMovies,
    getRandomCollection,
    getRandomMovies,
    getTopRatedMovies
} from "../services/moviesService.ts";
import {getRandomPeople} from "../services/peopleService.ts";

interface HomeDataResults {
    featured: PromiseSettledResult<Movie[]>;
    latest: PromiseSettledResult<Movie[]>;
    top: PromiseSettledResult<Movie[]>;
    collection: PromiseSettledResult<Collection>;
    people: PromiseSettledResult<Person[]>;
}

export function useHomeData() {
    const [randomFeaturedMovies, setRandomFeaturedMovies] = useState<Movie[]>([]);
    const [latestReleases, setLatestReleases] = useState<Movie[]>([]);
    const [topRated, setTopRated] = useState<Movie[]>([]);
    const [featuredPeople, setFeaturedPeople] = useState<Person[]>([]);
    const [featuredCollection, setFeaturedCollection] = useState<Collection | null>(null);
    const [loading, setLoading] = useState(true);
    const homeRequestRef = useRef<Promise<HomeDataResults> | null>(null);

    useEffect(() => {
        let active = true;

        if (!homeRequestRef.current) {
            homeRequestRef.current = Promise.allSettled([
                getRandomMovies(5),
                getLatestMovies(),
                getTopRatedMovies(),
                getRandomCollection(),
                getRandomPeople()
            ]).then(([featured, latest, top, collection, people]) => ({
                featured,
                latest,
                top,
                collection,
                people,
            }));
        }

        const load = async () => {
            try {
                const { featured, latest, top, collection, people } = await homeRequestRef.current!;
                if (!active) return;

                setRandomFeaturedMovies(featured.status === "fulfilled" ? featured.value : []);
                setLatestReleases(latest.status === "fulfilled" ? latest.value : []);
                setTopRated(top.status === "fulfilled" ? top.value : []);
                setFeaturedCollection(collection.status === "fulfilled" ? collection.value : null);
                setFeaturedPeople(people.status === "fulfilled" ? people.value : []);
            } catch (err) {
                if (active) console.error("Failed to load home data", err);
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, []);

    return {
        randomFeaturedMovies,
        latestReleases,
        topRated,
        featuredCollection,
        featuredPeople,
        loading,
    };
}
