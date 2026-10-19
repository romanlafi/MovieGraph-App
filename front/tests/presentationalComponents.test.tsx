import {renderToStaticMarkup} from "react-dom/server";
import {MemoryRouter} from "react-router-dom";
import {describe, expect, it, vi} from "vitest";

vi.mock("@/components/movie/LikeButton.tsx", () => ({default: () => <button type="button">Like</button>}));

import AsyncSection from "@/components/layout/AsyncSection.tsx";
import Container from "@/components/layout/Container.tsx";
import DetailMediaLayout from "@/components/layout/DetailMediaLayout.tsx";
import HorizontalScroller from "@/components/layout/HorizontalScroller.tsx";
import GenreBadge from "@/components/genre/GenreBadge.tsx";
import SelectableGenreBadge from "@/components/genre/SelectableGenreBadge.tsx";
import MovieFacts from "@/components/movie/MovieFacts.tsx";
import MovieGrid from "@/components/movie/MovieGrid.tsx";
import MovieMedia from "@/components/movie/MovieMedia.tsx";
import MoviePagination from "@/components/movie/MoviePagination.tsx";
import PersonCard from "@/components/person/PersonCard.tsx";
import PersonImage from "@/components/person/PersonImage.tsx";
import PersonMetadata from "@/components/person/PersonMetadata.tsx";
import Button from "@/components/ui/Button.tsx";
import CountryFlag from "@/components/ui/CountryFlag.tsx";
import ErrorState from "@/components/ui/ErrorState.tsx";
import LoadMoreButton from "@/components/ui/LoadMoreButton.tsx";
import LoadingSpinner from "@/components/ui/LoadingSpinner.tsx";
import RatingDisplay from "@/components/ui/RatingDisplay.tsx";
import Text from "@/components/ui/Text.tsx";
import TextInput from "@/components/ui/inputs/TextInput.tsx";
import Textarea from "@/components/ui/inputs/Textarea.tsx";
import Title from "@/components/ui/Title.tsx";

const render = (element: React.ReactElement) => renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
const movie = {
    tmdbId: 550, title: "Fight Club", poster_url: "/poster.jpg", backdrop_url: "/backdrop.jpg",
    trailer_url: "abc123", rating: 8.4, year: "1999", released: "1999-10-15", runtime: "139 min",
    box_office: 1000000, website: "https://example.test", origin_country: "us,gb", plot: "A story.",
    genres: ["Drama"],
} as never;
const person = {
    tmdbId: 287, name: "Brad Pitt", photo_url: "/brad.jpg", role: "DIRECTOR, ACTOR", character: "Tyler",
    birthday: "1963-12-18", place_of_birth: "Oklahoma", biography: "An actor and filmmaker.",
} as never;

describe("presentational components", () => {
    it("renders UI primitives with their optional styles and labels", () => {
        expect(render(<Button variant="secondary" disabled className="wide">Save</Button>)).toContain("disabled");
        expect(render(<CountryFlag code="US" />)).toContain("https://flagcdn.com/w40/us.png");
        expect(render(<LoadingSpinner />)).toContain("animate-spin");
        expect(render(<RatingDisplay rating={8.4} iconSize={16} className="score" />)).toContain("8.40");
        expect(render(<Text text="Primary" size="lg" color="accent" truncate italic weight="bold" as="span" />))
            .toContain("Primary");
        expect(render(<Text as="div">Child content</Text>)).toContain("Child content");
        expect(render(<Title title="Heading" size="xl" as="h1" center />)).toContain("Heading");
        expect(render(<Title as="h3">Nested heading</Title>)).toContain("Nested heading");
        expect(render(<TextInput label="Email" id="email" value="a@b.test" readOnly />)).toContain("for=\"email\"");
        expect(render(<TextInput placeholder="No label" />)).toContain("No label");
        expect(render(<Textarea label="Bio" id="bio" value="Hello" readOnly />)).toContain("Hello");
        expect(render(<Textarea placeholder="No label" />)).toContain("No label");
        expect(render(<LoadMoreButton onClick={vi.fn()} loading />)).toContain("Loading...");
        expect(render(<LoadMoreButton onClick={vi.fn()} label="More films" />)).toContain("More films");
    });

    it("renders error, async, layout and pagination states", () => {
        expect(render(<ErrorState message="Offline" onRetry={vi.fn()} />)).toContain("Try Again");
        expect(render(<AsyncSection title="Popular" loading={false} error empty errorMessage="Offline" onRetry={vi.fn()}>
            <p>Hidden</p>
        </AsyncSection>)).toContain("Offline");
        expect(render(<AsyncSection title="Popular" loading={false} error={false} empty emptyMessage="No films" errorMessage="Offline" onRetry={vi.fn()}>
            <p>Hidden</p>
        </AsyncSection>)).toContain("No films");
        expect(render(<AsyncSection title="Popular" loading={false} error={false} empty errorMessage="Offline" onRetry={vi.fn()}>
            <p>Visible films</p>
        </AsyncSection>)).toBe("");
        expect(render(<AsyncSection title="Popular" loading error={false} empty={false} errorMessage="Offline" onRetry={vi.fn()}>
            <p>Refreshing films</p>
        </AsyncSection>)).toContain("Updating popular...");
        expect(render(<AsyncSection title="Popular" loading={false} error empty={false} errorMessage="Offline" onRetry={vi.fn()}>
            <p>Visible films</p>
        </AsyncSection>)).toContain("Visible films");
        expect(render(<Container className="custom"><span>inside</span></Container>)).toContain("inside");
        expect(render(<DetailMediaLayout image={<img src="poster.jpg" alt="Poster" />}><p>Details</p></DetailMediaLayout>))
            .toContain("Details");
        expect(render(<HorizontalScroller><span>Card</span></HorizontalScroller>)).toContain("Card");
        expect(render(<MoviePagination error="Network error" hasMore loadingMore loadMore={vi.fn()} />)).toContain("Network error");
        expect(render(<MoviePagination error={null} hasMore={false} loadingMore={false} loadMore={vi.fn()} />)).toBe("<div class=\"space-y-4\"></div>");
    });

    it("renders movie and person metadata, catalogue images and selection controls", () => {
        expect(render(<GenreBadge genre="Drama" />)).toContain("/genre/Drama");
        expect(render(<SelectableGenreBadge genre="Drama" selected onClick={vi.fn()} />)).toContain("Drama");
        expect(render(<SelectableGenreBadge genre="Comedy" selected={false} onClick={vi.fn()} />)).toContain("Comedy");
        expect(render(<MovieFacts movie={movie} />)).toContain("Website");
        expect(render(<MovieFacts movie={{...movie, box_office: undefined, website: undefined, origin_country: undefined} as never} />))
            .not.toContain("Website");
        expect(render(<MovieGrid title="Films" movies={[movie]} />)).toContain("Fight Club");
        expect(render(<MovieMedia movie={movie} />)).toContain("Trailer");
        expect(render(<MovieMedia movie={{...movie, trailer_url: undefined} as never} />)).toContain("backdrop.jpg");
        expect(render(<PersonCard person={person} />)).toContain("Director");
        expect(render(<PersonCard person={{...person, role: "ACTOR"} as never} showRole={false} />)).toContain("Brad Pitt");
        expect(render(<PersonImage name="Unknown" photoPath={null} size="detail" className="image" />))
            .toContain("No hay foto disponible para Unknown");
        expect(render(<PersonMetadata person={person} />)).toContain("An actor and filmmaker.");
    });
});
