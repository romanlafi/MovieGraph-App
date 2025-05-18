import {useEffect, useState} from "react";

import { Movie } from "../../types/movie.ts";
import {getMovieByTmdbId, getMoviesByCollection, getRelatedMovies} from "../../services/moviesService.ts";

import {Person} from "../../types/person.ts";
import {getPeopleForMovie} from "../../services/peopleService.ts";

import {Comment} from "../../types/comment.ts";
import {getCommentsByMovie, postComment} from "../../services/commentService.ts";


export function useMovieDetail(id: string) {
    const [movie, setMovie] = useState<Movie | null>(null);
    const [cast, setCast] = useState<Person[]>([]);
    const [collectionMovies, setCollectionMovies] = useState<Movie[]>([]);
    const [relatedMovies, setRelatedMovies] = useState<Movie[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                setLoading(true);

                const movieData = await getMovieByTmdbId(id);
                setMovie(movieData);

                if (movieData) {
                    const [
                        castData,
                        relatedData,
                        commentData
                    ] = await Promise.all([
                        getPeopleForMovie(movieData.id),
                        getRelatedMovies(movieData.id),
                        getCommentsByMovie(movieData.id)
                    ]);

                    setCast(castData);
                    setRelatedMovies(relatedData);
                    setComments(commentData);

                    if (movieData.collection?.id) {
                        const collectionData = await getMoviesByCollection(movieData.collection.id);
                        setCollectionMovies(collectionData);
                    } else {
                        setCollectionMovies([]);
                    }
                }
            } catch (error) {
                console.error("Error loading movie data", error);
                setMovie(null);
            } finally {
                setLoading(false);
            }
        };

        void fetchData();
    }, [id]);

    const handleCommentSubmit = async (text: string) => {
        if (!movie?.id) return;

        try {
            await postComment(movie.id, text);
            const updatedComments = await getCommentsByMovie(movie.id);
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