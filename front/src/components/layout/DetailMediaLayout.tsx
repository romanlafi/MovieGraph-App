import type {ReactNode} from "react";

interface DetailMediaLayoutProps {
    image: ReactNode;
    children: ReactNode;
}

export default function DetailMediaLayout({image, children}: DetailMediaLayoutProps) {
    return (
        <div className="flex flex-col lg:flex-row gap-6 justify-center items-start mt-2">
            <div className="w-full max-w-xs mx-auto lg:mx-0 h-[420px] flex items-center justify-center rounded overflow-hidden">
                {image}
            </div>
            {children}
        </div>
    );
}
