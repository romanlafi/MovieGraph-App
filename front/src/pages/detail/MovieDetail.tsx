import { useParams } from "react-router-dom";

import MovieHeaderCard from "../../components/movie/MovieHeaderCard.tsx";
import PersonCarousel from "../../components/person/PersonCarousel.tsx";
import HeroCollection from "../../components/hero/HeroCollection.tsx";
import MovieCarousel from "../../components/movie/MovieCarousel.tsx";
import CommentSection from "../../components/comment/CommentSection.tsx";

import LoadingSpinner from "../../components/layout/LoadingSpinner.tsx";
import Container from "../../components/layout/Container.tsx";

import NotFound from "../NotFound.tsx";

import {useMovieDetail} from "../../hooks/movie/useMovieDetail.ts";

import {castAndCrew, relatedFilms } from "../../data/carouselCategories.ts";


export default function MovieDetail() {
    const { id } = useParams<{ id: string }>();
    const { movie, cast, collectionMovies, relatedMovies, comments, loading, handleCommentSubmit } = useMovieDetail(id ?? "");

    if (loading) return <LoadingSpinner />;
    if (!movie) return <NotFound />;

    return (
        <Container className="py-10 text-white space-y-10">
            <MovieHeaderCard
                movie={movie}
            />
            <PersonCarousel
                people={cast}
                title={castAndCrew.title}
                subtitle={castAndCrew.subtitle}
            />
            {movie.collection &&
                <HeroCollection
                    collection={movie.collection}
                    movies={collectionMovies}
                />
            }
            <MovieCarousel
                movies={relatedMovies}
                title={relatedFilms.title}
                subtitle={relatedFilms.subtitle}
                genreLink={false}
            />
            <CommentSection
                comments={comments}
                onSubmit={handleCommentSubmit}
            />
        </Container>
    );
}
