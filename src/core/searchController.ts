import { classifyError, type FailureKind } from './classifyError.js';
import { debounce } from './debounce.js';
import type { Country } from './types.js';

export const DEBOUNCE_MS = 300;

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'success'; query: string; countries: Country[] }
  | { status: 'empty'; query: string }
  | { status: 'error'; query: string; kind: Exclude<FailureKind, 'aborted'> };

export interface SearchControllerOptions {
  search: (query: string, signal: AbortSignal) => Promise<Country[]>;
  debounceMs?: number;
}

export interface SearchController {
  getState(): SearchState;
  subscribe(listener: (state: SearchState) => void): () => void;
  input(text: string): void;
  retry(): void;
}

export function createSearchController({
  search,
  debounceMs = DEBOUNCE_MS,
}: SearchControllerOptions): SearchController {
  let state: SearchState = { status: 'idle' };
  let latestQuery = '';
  let currentRequest: AbortController | null = null;
  const listeners = new Set<(state: SearchState) => void>();

  const setState = (next: SearchState): void => {
    state = next;
    listeners.forEach((listener) => listener(state));
  };

  const cancelCurrentRequest = (): void => {
    currentRequest?.abort();
    currentRequest = null;
  };

  const run = async (query: string): Promise<void> => {
    cancelCurrentRequest();
    const request = new AbortController();
    currentRequest = request;
    setState({ status: 'loading', query });

    try {
      const countries = await search(query, request.signal);
      setState(
        countries.length === 0
          ? { status: 'empty', query }
          : { status: 'success', query, countries },
      );
    } catch (error) {
      const kind = classifyError(error);
      if (kind === 'aborted') return;
      setState({ status: 'error', query, kind });
    }
  };

  const scheduleSearch = debounce(() => {
    if (latestQuery !== '') void run(latestQuery);
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
      if (latestQuery !== '') void run(latestQuery);
    },
  };
}
