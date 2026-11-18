import type { Country } from './types.js';

export type SearchFn = (
  query: string,
  signal: AbortSignal,
) => Promise<Country[]>;

export const MAX_CACHE_ENTRIES = 50;

interface InFlight {
  promise: Promise<Country[]>;
  controller: AbortController;
  subscribers: number;
}

interface CachedSearchOptions {
  maxEntries?: number;
}

const toKey = (query: string): string => query.trim().toLowerCase();

function followUntilAborted<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });

    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', onAbort));
  });
}

export function createCachedSearch(
  search: SearchFn,
  { maxEntries = MAX_CACHE_ENTRIES }: CachedSearchOptions = {},
): SearchFn {
  const cache = new Map<string, Country[]>();
  const inFlight = new Map<string, InFlight>();

  const remember = (key: string, countries: Country[]): void => {
    cache.delete(key);
    cache.set(key, countries);
    if (cache.size > maxEntries) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
  };

  const startRequest = (key: string, query: string): InFlight => {
    const controller = new AbortController();
    const promise = search(query, controller.signal).then((countries) => {
      remember(key, countries);
      return countries;
    });
    const entry: InFlight = { promise, controller, subscribers: 0 };
    inFlight.set(key, entry);

    const forget = (): void => {
      if (inFlight.get(key) === entry) inFlight.delete(key);
    };
    promise.then(forget, forget);

    return entry;
  };

  const leave = (key: string, entry: InFlight): void => {
    entry.subscribers -= 1;
    if (entry.subscribers > 0) return;

    if (inFlight.get(key) === entry) inFlight.delete(key);
    entry.controller.abort();
  };

  return (query, signal) => {
    if (signal.aborted) return Promise.reject(signal.reason);

    const key = toKey(query);

    const cached = cache.get(key);
    if (cached) return Promise.resolve([...cached]);

    const entry = inFlight.get(key) ?? startRequest(key, query);
    entry.subscribers += 1;

    const onAbort = (): void => leave(key, entry);
    const stopWatching = (): void =>
      signal.removeEventListener('abort', onAbort);
    signal.addEventListener('abort', onAbort, { once: true });
    entry.promise.then(stopWatching, stopWatching);

    return followUntilAborted(entry.promise, signal).then((countries) => [
      ...countries,
    ]);
  };
}
