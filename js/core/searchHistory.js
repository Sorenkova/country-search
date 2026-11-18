export const HISTORY_KEY = 'country-search:history';
export const HISTORY_LIMIT = 5;
function parseStored(raw) {
    if (raw === null)
        return [];
    try {
        const data = JSON.parse(raw);
        if (!Array.isArray(data))
            return [];
        return data.filter((item) => typeof item === 'string');
    }
    catch {
        return [];
    }
}
export function createSearchHistory(storage, { key = HISTORY_KEY, limit = HISTORY_LIMIT } = {}) {
    const read = () => {
        try {
            return parseStored(storage.getItem(key));
        }
        catch {
            return [];
        }
    };
    const write = (items) => {
        try {
            storage.setItem(key, JSON.stringify(items));
        }
        catch {
            // Storage can be blocked or full: the history is a convenience, not a must.
        }
    };
    return {
        get: read,
        add(query) {
            const text = query.trim();
            if (text === '')
                return read();
            const others = read().filter((item) => item.toLowerCase() !== text.toLowerCase());
            const next = [text, ...others].slice(0, limit);
            write(next);
            return next;
        },
    };
}
