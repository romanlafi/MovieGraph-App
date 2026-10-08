import {useState} from "react";
import {FaUser} from "react-icons/fa";
import {getTmdbImageUrl} from "../../utils/tmdbImageHelper.ts";

interface Props {
    name: string;
    photoPath?: string | null;
    size: "card" | "detail";
    className: string;
    imageClassName?: string;
}

export default function PersonImage({name, photoPath, size, className, imageClassName}: Props) {
    const imageUrl = getTmdbImageUrl(photoPath, size === "card" ? "w342" : "w500");
    const [failedImageUrl, setFailedImageUrl] = useState<string>();

    return (
        <div className={className}>
            {imageUrl && failedImageUrl !== imageUrl ? (
                <img
                    src={imageUrl}
                    alt={name}
                    loading={size === "card" ? "lazy" : undefined}
                    fetchPriority={size === "detail" ? "high" : undefined}
                    decoding="async"
                    onError={() => setFailedImageUrl(imageUrl)}
                    className={imageClassName ?? "w-full h-full object-cover"}
                />
            ) : (
                <div
                    role="img"
                    aria-label={`No hay foto disponible para ${name}`}
                    className="w-full h-full flex items-center justify-center bg-[#17191a] rounded-[inherit]"
                >
                    <div className={`flex items-center justify-center rounded-full bg-black/10 ${size === "card" ? "w-full h-full" : "w-56 h-56"}`}>
                        <FaUser
                            aria-hidden="true"
                            className={`text-white/[0.12] ${size === "card" ? "w-9 h-9" : "w-27 h-27"}`}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
