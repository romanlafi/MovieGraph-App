import {useCallback, useEffect, useState} from "react";

type ResourceLoader<Data> = (signal: AbortSignal) => Promise<Data>;

interface ResourceState<Data> {
    load: ResourceLoader<Data> | null;
    data: Data | null;
    loading: boolean;
    error: unknown;
}

export function useAsyncResource<Data>(load: ResourceLoader<Data> | null) {
    const [state, setState] = useState<ResourceState<Data>>({load, data: null, loading: Boolean(load), error: null});
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!load) {
            setState({load, data: null, loading: false, error: null});
            return;
        }
        const controller = new AbortController();
        setState(current => ({load, data: current.load === load ? current.data : null, loading: true, error: null}));
        void Promise.resolve().then(() => load(controller.signal))
            .then(data => {
                if (!controller.signal.aborted) setState({load, data, loading: false, error: null});
            })
            .catch((error: unknown) => {
                if (!controller.signal.aborted) setState(current => ({...current, loading: false, error}));
            });
        return () => controller.abort();
    }, [load, attempt]);

    const retry = useCallback(() => setAttempt(current => current + 1), []);
    const current = state.load === load && load
        ? state
        : {data: null, loading: Boolean(load), error: null};

    return {data: current.data, loading: current.loading, error: current.error, retry};
}
