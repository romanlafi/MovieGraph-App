import type {Person} from "@/types/person.ts";
import DetailMediaLayout from "@/components/layout/DetailMediaLayout.tsx";
import PersonImage from "./PersonImage.tsx";
import PersonMetadata from "./PersonMetadata.tsx";

export default function PersonHeaderCard({person}: Readonly<{person: Person}>) {
    return (
        <section className="bg-panel rounded-xl p-6 shadow space-y-4">
            <DetailMediaLayout image={
                <PersonImage
                    name={person.name}
                    photoPath={person.photo_url}
                    size="detail"
                    className="h-full w-full flex items-center justify-center rounded overflow-hidden"
                    imageClassName="h-full w-auto rounded object-cover"
                />
            }>
                <PersonMetadata person={person} />
            </DetailMediaLayout>
        </section>
    );
}
