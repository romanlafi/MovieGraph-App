import type {Movie} from "@/types/movie.ts";
import {FaCalendarAlt, FaClock, FaCoins, FaGlobe} from "react-icons/fa";
import {parseCountryCodes} from "@/utils/parseCountryCodes.ts";
import {formatCurrency} from "@/utils/formatters.ts";
import CountryFlag from "@/components/ui/CountryFlag.tsx";

export default function MovieFacts({movie}: Readonly<{movie: Movie}>) {
    const countries = parseCountryCodes(movie.origin_country);

    return (
        <>
            <div className="flex flex-wrap gap-4 text-sm text-ink/80">
                <span className="flex items-center gap-2"><FaCalendarAlt className="text-accent" />{movie.year}</span>
                <span className="flex items-center gap-2"><FaClock className="text-accent" />{movie.runtime}</span>
                {movie.box_office && <span className="flex items-center gap-2"><FaCoins className="text-accent"/>{formatCurrency(movie.box_office)}</span>}
                {movie.website && <a className="flex items-center gap-2" href={movie.website} target="_blank"><FaGlobe className="text-accent"/>Website</a>}
            </div>
            {countries.length > 0 && (
                <span className="flex items-center gap-2">
                    {countries.map(countryCode => <CountryFlag key={countryCode} code={countryCode} />)}
                </span>
            )}
        </>
    );
}
