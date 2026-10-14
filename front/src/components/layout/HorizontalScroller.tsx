import type {ReactNode} from "react";

export default function HorizontalScroller({children}: {children: ReactNode}) {
    return (
        <div className="overflow-x-auto">
            <div className="flex gap-4 pb-4 scroll-smooth snap-x snap-mandatory whitespace-nowrap">
                {children}
            </div>
        </div>
    );
}
