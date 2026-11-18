import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../src/core/errors.js';
import { searchCountries } from '../src/core/searchCountries.js';
import {
  createControlledFetch,
  jsonResponse,
} from './helpers/controlledFetch.js';

const spain = {
  name: 'Spain',
  capital: 'Madrid',
  region: 'Europe',
  population: 47450795,
};

describe('searchCountries', () => {
  let controlled: ReturnType<typeof createControlledFetch>;

  beforeEach(() => {
    controlled = createControlledFetch();
    vi.stubGlobal('fetch', controlled.fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests the url-encoded query', async () => {
    const promise = searchCountries(
      'united states',
      new AbortController().signal,
    );
    controlled.respond(0, jsonResponse([spain]));
    await promise;

    expect(controlled.calls[0]?.url).toBe(
      'https://countries.dev/name/united%20states',
    );
  });

  it('returns mapped countries on success', async () => {
    const promise = searchCountries('spain', new AbortController().signal);
    controlled.respond(0, jsonResponse([spain]));
    const countries = await promise;

    expect(countries).toHaveLength(1);
    expect(countries[0]?.name).toBe('Spain');
    expect(countries[0]?.capital).toBe('Madrid');
  });

  it('returns an empty array on 404 instead of throwing', async () => {
    const promise = searchCountries('qqqq', new AbortController().signal);
    controlled.respond(0, new Response(null, { status: 404 }));

    await expect(promise).resolves.toEqual([]);
  });

  it.each([429, 500, 503])('throws HttpError on status %i', async (status) => {
    const promise = searchCountries('spain', new AbortController().signal);
    const assertion = expect(promise).rejects.toBeInstanceOf(HttpError);
    controlled.respond(0, new Response('fail', { status }));
    await assertion;

    await expect(promise).rejects.toMatchObject({ status });
  });

  it('rejects with AbortError when the caller aborts', async () => {
    const controller = new AbortController();
    const promise = searchCountries('spain', controller.signal);
    const assertion = expect(promise).rejects.toMatchObject({
      name: 'AbortError',
    });

    controller.abort();

    await assertion;
  });

  it('rejects with TimeoutError when the server does not answer in time', async () => {
    const promise = searchCountries('spain', new AbortController().signal, 20);

    await expect(promise).rejects.toMatchObject({ name: 'TimeoutError' });
  });
});
