import { useParams } from "react-router-dom";

import MovieHeaderCard from "../components/movie/MovieHeaderCard";
import PersonCarousel from "../components/person/PersonCarousel.tsx";
import MovieCarousel from "../components/movie/MovieCarousel.tsx";
import CommentSection from "../components/comment/CommentSection.tsx";

import NotFound from "./NotFound.tsx";
import LoadingSpinner from "../components/layout/LoadingSpinner.tsx";

import {useMovieDetail} from "../hooks/useMovieDetail.ts";

import {mainCast} from "../data/carouselCategories.ts";
import Container from "../components/common/Container.tsx";


export default function MovieDetail() {
    const { id } = useParams<{ id: string }>();
    const { movie, cast, relatedMovies, comments, loading, handleCommentSubmit } = useMovieDetail(id || "");

    if (loading) return <LoadingSpinner />;
    if (!movie) return <NotFound />;

    return (
        <Container className="py-10 text-white space-y-10">
            {movie && <MovieHeaderCard movie={movie} />}
            {cast.length > 0 && <PersonCarousel people={cast} title={mainCast} />}
            {relatedMovies.length > 0 && <MovieCarousel movies={relatedMovies} title="Related Movies" />}
            <CommentSection comments={comments} onSubmit={handleCommentSubmit} />
        </Container>
    );
}
