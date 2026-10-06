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
                setCast(movieData.cast ?? []);

                if (movieData) {
                    const [
                        relatedData,
                        commentData
                    ] = await Promise.allSettled([
                        getRelatedMovies(movieData.tmdb_id),
                        getCommentsByMovie(movieData.tmdb_id)
                    ]);
                    if (!active) return;

                    setRelatedMovies(relatedData.status === "fulfilled" ? relatedData.value : []);
                    setComments(commentData.status === "fulfilled" ? commentData.value : []);

                    if (movieData.collection?.tmdb_id) {
                        const collectionData = await getMoviesByCollection(movieData.collection.tmdb_id).catch(() => []);
                        if (!active) return;
                        setCollectionMovies(collectionData);
                    } else {
                        setCollectionMovies([]);
                    }
                }
            } catch (error) {
                console.error("Error loading movie data", error);
                if (active) setMovie(null);
            } finally {
                if (active) setLoading(false);
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
