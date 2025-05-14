import LoadingSpinner from "../components/layout/LoadingSpinner.tsx";
import Button from "../components/common/Button.tsx";
import Container from "../components/common/Container.tsx";
import MovieCarousel from "../components/movie/MovieCarousel.tsx";

import {genreDescriptions} from "../data/genreDescriptions.ts";
import {useExploreGenres} from "../hooks/useExploreGenres.ts";

export default function ExploreGenresPage() {
    const { visibleGenres, genreMovies, loading, loadMoreGenres, loadingMore } = useExploreGenres();

    if (loading) return <LoadingSpinner />;

    return (
        <Container className="space-y-10 pb-10 mt-10">
            {visibleGenres.map((genre) => (
                <MovieCarousel
                    key={genre.id}
                    title={genre.name}
                    subtitle={genreDescriptions[genre.name] ?? ""}
                    genreLink
                    movies={genreMovies[genre.id] ?? []}
                />
            ))}

            {visibleGenres.length < Object.keys(genreMovies).length && (
                <div className="flex justify-center">
                    <Button onClick={loadMoreGenres} disabled={loadingMore}>
                        {loadingMore ? "Loading..." : "Load More Genres"}
                    </Button>
                </div>
            )}
        </Container>
    );
}
