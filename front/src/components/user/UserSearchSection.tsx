import {FaSearch} from "react-icons/fa";
import TextInput from "@/components/ui/inputs/TextInput.tsx";
import Button from "@/components/ui/Button.tsx";
import UserGrid from "./UserGrid.tsx";
import {useUserSearch} from "@/hooks/user/useUserSearch.ts";

interface Props {
    onFollowChange: () => void;
}

export default function UserSearchSection({onFollowChange}: Readonly<Props>) {
    const {query, results, searchedQuery, searching, searchError, updateQuery, search} = useUserSearch();
    let searchStatus = "Find a friend or someone who shares your taste in movies.";
    if (searching) searchStatus = "Looking for people…";
    else if (searchedQuery && results.length > 0) {
        const peopleLabel = results.length === 1 ? "person" : "people";
        searchStatus = `${results.length} ${peopleLabel} found for “${searchedQuery}”`;
    } else if (searchedQuery) {
        searchStatus = `No people found for “${searchedQuery}”. Try another username or email.`;
    }
    return (
        <section aria-labelledby="find-people-title" className="space-y-5 rounded-xl bg-panel p-5 sm:p-6">
            <div>
                <h2 id="find-people-title" className="text-lg font-semibold text-ink">Find people</h2>
                <p id="people-search-help" className="mt-1 text-sm text-muted">Search by username or email. At least two characters.</p>
            </div>
            <form onSubmit={event => { event.preventDefault(); void search(); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <TextInput
                    id="people-search"
                    name="query"
                    type="search"
                    label="Username or email"
                    placeholder="Find someone…"
                    value={query}
                    minLength={2}
                    required
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-describedby="people-search-help"
                    className="!bg-card !text-base min-h-11"
                    onChange={event => updateQuery(event.target.value)}
                />
                <Button type="submit" disabled={searching} className="inline-flex min-h-11 items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                    <FaSearch aria-hidden="true" />{searching ? "Searching…" : "Search"}
                </Button>
            </form>
            {searchError && <p role="alert" className="text-sm text-red-300">{searchError}</p>}
            <output className="block text-sm text-muted">
                {searchStatus}
            </output>
            {results.length > 0 && <UserGrid users={results} onFollowChange={onFollowChange} />}
        </section>
    );
}
