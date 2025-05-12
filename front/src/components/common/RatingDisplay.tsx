import {FaStar} from "react-icons/fa";

interface RatingDisplayProps {
    rating: number;
    className?: string;
    iconSize?: number | string;
}

export default function RatingDisplay({
                                          rating,
                                          className = "",
                                          iconSize = 12,
                                      }: RatingDisplayProps) {
    return (
        <div className={`flex items-center gap-1 text-yellow-400 ${className}`}>
            <FaStar size={iconSize} />
            <span className="font-medium text-sm">{rating.toPrecision(3)}</span>
        </div>
    );
}