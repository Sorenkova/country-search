export const MAX_CACHE_ENTRIES = 50;
const toKey = (query) => query.trim().toLowerCase();
function followUntilAborted(promise, signal) {
    return new Promise((resolve, reject) => {
        const onAbort = () => reject(signal.reason);
        signal.addEventListener('abort', onAbort, { once: true });
        promise
            .then(resolve, reject)
            .finally(() => signal.removeEventListener('abort', onAbort));
    });
}
export function createCachedSearch(search, { maxEntries = MAX_CACHE_ENTRIES } = {}) {
    const cache = new Map();
    const inFlight = new Map();
    const remember = (key, countries) => {
        cache.delete(key);
        cache.set(key, countries);
        if (cache.size > maxEntries) {
            const oldest = cache.keys().next().value;
            if (oldest !== undefined)
                cache.delete(oldest);
        }
    };
    const startRequest = (key, query) => {
        const controller = new AbortController();
        const promise = search(query, controller.signal).then((countries) => {
            remember(key, countries);
            return countries;
        });
        const entry = { promise, controller, subscribers: 0 };
        inFlight.set(key, entry);
        const forget = () => {
            if (inFlight.get(key) === entry)
                inFlight.delete(key);
        };
        promise.then(forget, forget);
        return entry;
    };
    const leave = (key, entry) => {
        entry.subscribers -= 1;
        if (entry.subscribers > 0)
            return;
        if (inFlight.get(key) === entry)
            inFlight.delete(key);
        entry.controller.abort();
    };
    return (query, signal) => {
        if (signal.aborted)
            return Promise.reject(signal.reason);
        const key = toKey(query);
        const cached = cache.get(key);
        if (cached)
            return Promise.resolve([...cached]);
        const entry = inFlight.get(key) ?? startRequest(key, query);
        entry.subscribers += 1;
        const onAbort = () => leave(key, entry);
        const stopWatching = () => signal.removeEventListener('abort', onAbort);
        signal.addEventListener('abort', onAbort, { once: true });
        entry.promise.then(stopWatching, stopWatching);
        return followUntilAborted(entry.promise, signal).then((countries) => [
            ...countries,
        ]);
    };
}
