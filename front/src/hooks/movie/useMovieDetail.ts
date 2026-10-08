import {useEffect, useState} from "react";

import { Movie } from "../../types/movie.ts";
import {getMovieByTmdbId, getMoviesByCollection, getRelatedMovies} from "../../services/moviesService.ts";

import {Person} from "../../types/person.ts";

import {Comment} from "../../types/comment.ts";
import {getCommentsByMovie, postComment} from "../../services/commentService.ts";


export function useMovieDetail(tmdbMovieId: string) {
    const [movie, setMovie] = useState<Movie | null>(null);
    const [cast, setCast] = useState<Person[]>([]);
    const [collectionMovies, setCollectionMovies] = useState<Movie[]>([]);
    const [relatedMovies, setRelatedMovies] = useState<Movie[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tmdbMovieId) return;
        let active = true;

        const fetchData = async () => {
            try {
                setLoading(true);
                setComments([]);
                setRelatedMovies([]);
                setCollectionMovies([]);

                const movieData = await getMovieByTmdbId(tmdbMovieId);
                if (!active) return;
                setMovie(movieData);
                setCast([...(movieData.cast ?? [])].sort((personA, personB) => {
                    const aIsDirector = personA.role?.split(",").some(role => role.trim() === "DIRECTOR") ?? false;
                    const bIsDirector = personB.role?.split(",").some(role => role.trim() === "DIRECTOR") ?? false;
                    return Number(bIsDirector) - Number(aIsDirector);
                }));
                setLoading(false);

                const enrichmentRequests: Promise<unknown>[] = [
                    getRelatedMovies(movieData.tmdb_id)
                        .then((data) => { if (active) setRelatedMovies(data); })
                        .catch(() => { if (active) setRelatedMovies([]); }),
                    getCommentsByMovie(movieData.tmdb_id)
                        .then((data) => { if (active) setComments(data); })
                        .catch(() => { if (active) setComments([]); }),
                ];

                if (movieData.collection?.tmdb_id) {
                    enrichmentRequests.push(
                        getMoviesByCollection(movieData.collection.tmdb_id)
                            .then((data) => { if (active) setCollectionMovies(data); })
                            .catch(() => { if (active) setCollectionMovies([]); }),
                    );
                }

                void Promise.all(enrichmentRequests);
            } catch (error) {
                console.error("Error loading movie data", error);
                if (active) {
                    setMovie(null);
                    setLoading(false);
                }
            }
        };

        void fetchData();
        return () => { active = false; };
    }, [tmdbMovieId]);

    const handleCommentSubmit = async (text: string) => {
        if (!movie?.tmdb_id) return;

        try {
            await postComment(movie.tmdb_id, text);
            const updatedComments = await getCommentsByMovie(movie.tmdb_id);
            setComments(updatedComments);
        } catch (error) {
            console.error("Error submitting comment", error);
        }
    };

    return {
        movie,
        cast,
        collectionMovies,
        relatedMovies,
        comments,
        loading,
        handleCommentSubmit
    };
}
