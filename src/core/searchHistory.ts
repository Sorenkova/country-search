export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SearchHistory {
  get(): string[];
  add(query: string): string[];
}

export const HISTORY_KEY = 'country-search:history';
export const HISTORY_LIMIT = 5;

interface SearchHistoryOptions {
  key?: string;
  limit?: number;
}

function parseStored(raw: string | null): string[] {
  if (raw === null) return [];

  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function createSearchHistory(
  storage: StorageLike,
  { key = HISTORY_KEY, limit = HISTORY_LIMIT }: SearchHistoryOptions = {},
): SearchHistory {
  const read = (): string[] => {
    try {
      return parseStored(storage.getItem(key));
    } catch {
      return [];
    }
  };

  const write = (items: string[]): void => {
    try {
      storage.setItem(key, JSON.stringify(items));
    } catch {
      // Storage can be blocked or full: the history is a convenience, not a must.
    }
  };

  return {
    get: read,
    add(query) {
      const text = query.trim();
      if (text === '') return read();

      const others = read().filter(
        (item) => item.toLowerCase() !== text.toLowerCase(),
      );
      const next = [text, ...others].slice(0, limit);
      write(next);
      return next;
    },
  };
}
