import type {Movie} from "../types/movie.ts";
import type {Person} from "../types/person.ts";
import {getFollowedMovieLikes} from "./followService.ts";
import {getUserLikes} from "./movieLikesService.ts";
import {CatalogueMovie, toMovie} from "./catalogueAdapters.ts";
import {getTmdbCatalogue} from "./tmdbService.ts";

const SOURCE_MOVIE_LIMIT = 3;

interface RankedMovie {
    movie: CatalogueMovie;
    sourceCount: number;
    rankTotal: number;
}

export interface PersonalizedRecommendations {
    hero: Movie[];
    basedOnLikes: Movie[];
    familiarFaces: Person[];
    fromFriends: Movie[];
}

const uniqueIds = (ids: number[]): number[] => [...new Set(ids)].filter(id => id > 0);

const fulfilledValues = <Value>(results: PromiseSettledResult<Value>[]): Value[] =>
    results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);

const recommendationsFrom = async (
    sourceIds: number[],
    excludedIds: Set<number>,
    limit: number,
    signal: AbortSignal,
): Promise<Movie[]> => {
    const results = await Promise.allSettled(sourceIds.slice(0, SOURCE_MOVIE_LIMIT).map(tmdbMovieId =>
        getTmdbCatalogue<CatalogueMovie[]>(`movie/${tmdbMovieId}/recommendations`, undefined, signal),
    ));
    const ranked = new Map<number, RankedMovie>();

    for (const movies of fulfilledValues(results)) {
        movies.forEach((movie, index) => {
            if (excludedIds.has(movie.tmdb_id) || !movie.poster_path) return;
            const existing = ranked.get(movie.tmdb_id);
            if (existing) {
                existing.sourceCount += 1;
                existing.rankTotal += index;
            } else {
                ranked.set(movie.tmdb_id, {movie, sourceCount: 1, rankTotal: index});
            }
        });
    }

    return [...ranked.values()]
        .sort((left, right) => right.sourceCount - left.sourceCount
            || left.rankTotal / left.sourceCount - right.rankTotal / right.sourceCount
            || (right.movie.vote_average ?? 0) - (left.movie.vote_average ?? 0)
            || left.movie.tmdb_id - right.movie.tmdb_id)
        .slice(0, limit)
        .map(({movie}) => toMovie(movie));
};

const recommendedPeople = async (likedIds: number[], signal: AbortSignal): Promise<Person[]> => {
    const details = await Promise.allSettled(likedIds.slice(0, SOURCE_MOVIE_LIMIT).map(tmdbMovieId =>
        getTmdbCatalogue<CatalogueMovie>(`movie/${tmdbMovieId}`, undefined, signal),
    ));
    const people = new Map<string, {person: Person; appearances: number}>();

    for (const movie of fulfilledValues(details)) {
        for (const person of toMovie(movie).cast ?? []) {
            if (!person.photo_url) continue;
            const existing = people.get(person.tmdb_id);
            if (existing) existing.appearances += 1;
            else people.set(person.tmdb_id, {person, appearances: 1});
        }
    }

    return [...people.values()]
        .sort((left, right) => right.appearances - left.appearances
            || left.person.name.localeCompare(right.person.name))
        .slice(0, 10)
        .map(({person}) => person);
};

export const getPersonalizedRecommendations = async (signal: AbortSignal): Promise<PersonalizedRecommendations> => {
    const [likesResult, friendsResult] = await Promise.allSettled([
        getUserLikes(signal),
        getFollowedMovieLikes(signal),
    ]);
    const likedIds = likesResult.status === "fulfilled" ? uniqueIds(likesResult.value) : [];
    const friendIds = friendsResult.status === "fulfilled"
        ? uniqueIds(friendsResult.value).filter(id => !likedIds.includes(id))
        : [];
    const likedSet = new Set(likedIds);

    const [basedOnLikes, fromFriends, familiarFaces] = await Promise.all([
        recommendationsFrom(likedIds, likedSet, 10, signal),
        recommendationsFrom(friendIds, likedSet, 20, signal),
        recommendedPeople(likedIds, signal),
    ]);

    const heroDetails = await Promise.allSettled(basedOnLikes.slice(0, 3).map(movie =>
        getTmdbCatalogue<CatalogueMovie>(`movie/${movie.tmdb_id}`, undefined, signal),
    ));
    const hero = fulfilledValues(heroDetails)
        .map(toMovie)
        .filter(movie => Boolean(movie.backdrop_url));

    return {hero, basedOnLikes, familiarFaces, fromFriends};
};
