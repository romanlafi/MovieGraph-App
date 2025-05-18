import {useEffect, useState} from "react";
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

export function useHomeData() {
    const [randomFeaturedMovies, setRandomFeaturedMovies] = useState<Movie[]>([]);
    const [latestReleases, setLatestReleases] = useState<Movie[]>([]);
    const [topRated, setTopRated] = useState<Movie[]>([]);
    const [featuredPeople, setFeaturedPeople] = useState<Person[]>([]);
    const [featuredCollection, setFeaturedCollection] = useState<Collection | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [
                    featured,
                    latest,
                    top,
                    collection,
                    people
                ] = await Promise.all([
                    getRandomMovies(5),
                    getLatestMovies(),
                    getTopRatedMovies(),
                    getRandomCollection(),
                    getRandomPeople()
                ]);

                setRandomFeaturedMovies(featured);
                setLatestReleases(latest);
                setTopRated(top);
                setFeaturedCollection(collection);
                setFeaturedPeople(people);
            } catch (err) {
                console.error("Failed to load home data", err);
            } finally {
                setLoading(false);
            }
        };

        void fetch();
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