import { classifyError } from './classifyError.js';
import { debounce } from './debounce.js';
export const DEBOUNCE_MS = 300;
export function createSearchController({ search, debounceMs = DEBOUNCE_MS, }) {
    let state = { status: 'idle' };
    let latestQuery = '';
    let currentRequest = null;
    const listeners = new Set();
    const setState = (next) => {
        state = next;
        listeners.forEach((listener) => listener(state));
    };
    const cancelCurrentRequest = () => {
        currentRequest?.abort();
        currentRequest = null;
    };
    const run = async (query) => {
        cancelCurrentRequest();
        const request = new AbortController();
        currentRequest = request;
        setState({ status: 'loading', query });
        try {
            const countries = await search(query, request.signal);
            setState(countries.length === 0
                ? { status: 'empty', query }
                : { status: 'success', query, countries });
        }
        catch (error) {
            const kind = classifyError(error);
            if (kind === 'aborted')
                return;
            setState({ status: 'error', query, kind });
        }
    };
    const scheduleSearch = debounce(() => {
        if (latestQuery !== '')
            void run(latestQuery);
    }, debounceMs);
    return {
        getState: () => state,
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        input(text) {
            latestQuery = text.trim();
            cancelCurrentRequest();
            if (latestQuery === '') {
                setState({ status: 'idle' });
                return;
            }
            scheduleSearch();
        },
        retry() {
            if (latestQuery !== '')
                void run(latestQuery);
        },
    };
}
