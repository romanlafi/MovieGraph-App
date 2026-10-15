import {useEffect, useRef, useState} from "react";
import type {User} from "@/types/user.ts";
import {searchUsers} from "@/services/followService.ts";

export function useUserSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<User[]>([]);
    const [searchedQuery, setSearchedQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState("");
    const request = useRef<AbortController | null>(null);

    useEffect(() => () => request.current?.abort(), []);

    const updateQuery = (value: string) => {
        request.current?.abort();
        request.current = null;
        setQuery(value);
        setResults([]);
        setSearchedQuery("");
        setSearchError("");
        setSearching(false);
    };

    const search = async () => {
        if (request.current) return;
        const trimmedQuery = query.trim();
        if (trimmedQuery.length < 2) {
            setSearchError("Enter at least two characters to search.");
            return;
        }
        const controller = new AbortController();
        request.current = controller;
        setSearching(true);
        setSearchError("");
        setResults([]);
        setSearchedQuery("");
        try {
            const users = await searchUsers(trimmedQuery, controller.signal);
            if (controller.signal.aborted) return;
            setResults(users);
            setSearchedQuery(trimmedQuery);
        } catch {
            if (!controller.signal.aborted) setSearchError("Couldn't search for people. Please try again.");
        } finally {
            if (!controller.signal.aborted) {
                request.current = null;
                setSearching(false);
            }
        }
    };

    return {query, results, searchedQuery, searching, searchError, updateQuery, search};
}
