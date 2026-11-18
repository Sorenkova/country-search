import { describe, expect, it, vi } from 'vitest';
import { createCachedSearch } from '../src/core/cachedSearch.js';
import type { Country } from '../src/core/types.js';

function country(name: string): Country {
  return {
    name,
    nativeName: name,
    demonym: '',
    flag: '',
    capital: '—',
    region: '',
    subregion: '',
    population: 0,
    area: 0,
    borders: [],
    languages: [],
    currencies: [],
    description: name,
  };
}

function createFakeSearch() {
  const calls: {
    query: string;
    signal: AbortSignal;
    resolve: (countries: Country[]) => void;
    reject: (error: unknown) => void;
  }[] = [];

  const search = vi.fn((query: string, signal: AbortSignal) => {
    return new Promise<Country[]>((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), {
        once: true,
      });
      calls.push({ query, signal, resolve, reject });
    });
  });

  return { search, calls };
}

describe('createCachedSearch', () => {
  it('returns the cached result without a second request', async () => {
    const { search, calls } = createFakeSearch();
    const cached = createCachedSearch(search);

    const first = cached('spain', new AbortController().signal);
    calls[0]?.resolve([country('Spain')]);
    await first;

    const second = await cached('spain', new AbortController().signal);

    expect(second).toEqual([country('Spain')]);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('treats queries that differ only by case or spaces as the same key', async () => {
    const { search, calls } = createFakeSearch();
    const cached = createCachedSearch(search);

    const first = cached('Spain', new AbortController().signal);
    calls[0]?.resolve([country('Spain')]);
    await first;

    await cached('  sPAIN ', new AbortController().signal);

    expect(search).toHaveBeenCalledTimes(1);
  });

  it('shares one request between simultaneous identical queries', async () => {
    const { search, calls } = createFakeSearch();
    const cached = createCachedSearch(search);

    const a = cached('spain', new AbortController().signal);
    const b = cached('spain', new AbortController().signal);
    calls[0]?.resolve([country('Spain')]);

    expect(await a).toEqual([country('Spain')]);
    expect(await b).toEqual([country('Spain')]);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('does not mix up different queries', async () => {
    const { search, calls } = createFakeSearch();
    const cached = createCachedSearch(search);

    const a = cached('spain', new AbortController().signal);
    const b = cached('italy', new AbortController().signal);
    calls[1]?.resolve([country('Italy')]);
    calls[0]?.resolve([country('Spain')]);

    expect(await a).toEqual([country('Spain')]);
    expect(await b).toEqual([country('Italy')]);
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('aborting one caller does not break the others sharing the request', async () => {
    const { search, calls } = createFakeSearch();
    const cached = createCachedSearch(search);
    const first = new AbortController();

    const a = cached('spain', first.signal);
    const b = cached('spain', new AbortController().signal);
    const aResult = a.catch((error: unknown) => error);

    first.abort();
    const aError = await aResult;
    calls[0]?.resolve([country('Spain')]);

    expect((aError as Error).name).toBe('AbortError');
    expect(await b).toEqual([country('Spain')]);
    expect(calls[0]?.signal.aborted).toBe(false);
  });

  it('aborts the network request when every caller has gone', async () => {
    const { search, calls } = createFakeSearch();
    const cached = createCachedSearch(search);
    const first = new AbortController();
    const second = new AbortController();

    const a = cached('spain', first.signal).catch((e: unknown) => e);
    const b = cached('spain', second.signal).catch((e: unknown) => e);

    first.abort();
    expect(calls[0]?.signal.aborted).toBe(false);
    second.abort();

    expect(calls[0]?.signal.aborted).toBe(true);
    expect(((await a) as Error).name).toBe('AbortError');
    expect(((await b) as Error).name).toBe('AbortError');
  });

  it('starts a new request after the previous one was aborted by everyone', async () => {
    const { search, calls } = createFakeSearch();
    const cached = createCachedSearch(search);
    const first = new AbortController();

    const a = cached('spain', first.signal).catch((e: unknown) => e);
    first.abort();
    await a;

    const b = cached('spain', new AbortController().signal);
    calls[1]?.resolve([country('Spain')]);

    expect(await b).toEqual([country('Spain')]);
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('rejects at once for a signal that is already aborted', async () => {
    const { search } = createFakeSearch();
    const cached = createCachedSearch(search);
    const controller = new AbortController();
    controller.abort();

    const error = await cached('spain', controller.signal).catch(
      (e: unknown) => e,
    );

    expect((error as Error).name).toBe('AbortError');
    expect(search).not.toHaveBeenCalled();
  });

  it('does not cache failures, the next call asks the network again', async () => {
    const { search, calls } = createFakeSearch();
    const cached = createCachedSearch(search);

    const first = cached('spain', new AbortController().signal);
    calls[0]?.reject(new Error('boom'));
    await expect(first).rejects.toThrow('boom');

    const second = cached('spain', new AbortController().signal);
    calls[1]?.resolve([country('Spain')]);

    expect(await second).toEqual([country('Spain')]);
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('caches an empty result too, so "nothing found" is not asked twice', async () => {
    const { search, calls } = createFakeSearch();
    const cached = createCachedSearch(search);

    const first = cached('qqq', new AbortController().signal);
    calls[0]?.resolve([]);
    await first;

    expect(await cached('qqq', new AbortController().signal)).toEqual([]);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('forgets the oldest query when the cache is full', async () => {
    const { search, calls } = createFakeSearch();
    const cached = createCachedSearch(search, { maxEntries: 2 });

    for (const [index, query] of ['a', 'b', 'c'].entries()) {
      const pending = cached(query, new AbortController().signal);
      calls[index]?.resolve([country(query)]);
      await pending;
    }

    await cached('c', new AbortController().signal);
    expect(search).toHaveBeenCalledTimes(3);

    const again = cached('a', new AbortController().signal);
    calls[3]?.resolve([country('a')]);
    await again;
    expect(search).toHaveBeenCalledTimes(4);
  });

  it('does not let callers change the cached data', async () => {
    const { search, calls } = createFakeSearch();
    const cached = createCachedSearch(search);

    const first = cached('spain', new AbortController().signal);
    calls[0]?.resolve([country('Spain')]);
    (await first).pop();

    expect(await cached('spain', new AbortController().signal)).toHaveLength(1);
  });
});
