import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSearchController } from '../src/core/searchController.js';
import { searchCountries } from '../src/core/searchCountries.js';
import {
  createControlledFetch,
  jsonResponse,
} from './helpers/controlledFetch.js';

const spain = { name: 'Spain', capital: 'Madrid' };
const serverError = () => new Response('fail', { status: 500 });

describe('createSearchController', () => {
  let controlled: ReturnType<typeof createControlledFetch>;

  beforeEach(() => {
    vi.useFakeTimers();
    controlled = createControlledFetch();
    vi.stubGlobal('fetch', controlled.fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const create = () =>
    createSearchController({
      search: (query, signal) => searchCountries(query, signal),
      debounceMs: 300,
    });

  const flush = () => vi.advanceTimersByTimeAsync(0);

  it('starts idle', () => {
    expect(create().getState()).toEqual({ status: 'idle' });
  });

  it('does not send a request for empty or whitespace input', async () => {
    const controller = create();

    controller.input('   ');
    await vi.advanceTimersByTimeAsync(300);

    expect(controlled.calls).toHaveLength(0);
    expect(controller.getState()).toEqual({ status: 'idle' });
  });

  it('waits for the debounce delay before sending a request', async () => {
    const controller = create();

    controller.input('spain');
    await vi.advanceTimersByTimeAsync(299);
    expect(controlled.calls).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(controlled.calls).toHaveLength(1);
    expect(controller.getState()).toEqual({
      status: 'loading',
      query: 'spain',
    });
  });

  it('shows countries after a successful response', async () => {
    const controller = create();

    controller.input('spain');
    await vi.advanceTimersByTimeAsync(300);
    controlled.respond(0, jsonResponse([spain]));
    await flush();

    expect(controller.getState()).toMatchObject({
      status: 'success',
      query: 'spain',
      countries: [expect.objectContaining({ name: 'Spain' })],
    });
  });

  it('shows the empty state on 404', async () => {
    const controller = create();

    controller.input('qqqq');
    await vi.advanceTimersByTimeAsync(300);
    controlled.respond(0, new Response(null, { status: 404 }));
    await flush();

    expect(controller.getState()).toEqual({ status: 'empty', query: 'qqqq' });
  });

  it('shows an http error on a server failure', async () => {
    const controller = create();

    controller.input('spain');
    await vi.advanceTimersByTimeAsync(300);
    controlled.respond(0, serverError());
    await flush();

    expect(controller.getState()).toEqual({
      status: 'error',
      query: 'spain',
      kind: 'http',
    });
  });

  it('retry repeats the last typed query', async () => {
    const controller = create();

    controller.input('spain');
    await vi.advanceTimersByTimeAsync(300);
    controlled.respond(0, serverError());
    await flush();

    controller.retry();
    expect(controlled.calls).toHaveLength(2);
    expect(controlled.calls[1]?.url).toBe('https://countries.dev/name/spain');

    controlled.respond(1, jsonResponse([spain]));
    await flush();

    expect(controller.getState()).toMatchObject({ status: 'success' });
  });

  it('retry uses the latest query, not the first one', async () => {
    const controller = create();

    controller.input('spain');
    await vi.advanceTimersByTimeAsync(300);
    controlled.respond(0, serverError());
    await flush();

    controller.input('fra');
    await vi.advanceTimersByTimeAsync(300);
    controlled.respond(1, serverError());
    await flush();

    controller.retry();

    expect(controlled.calls[2]?.url).toBe('https://countries.dev/name/fra');
  });
});
