import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSearchController,
  type SearchState,
} from '../src/core/searchController.js';
import { searchCountries } from '../src/core/searchCountries.js';
import {
  createControlledFetch,
  jsonResponse,
} from './helpers/controlledFetch.js';

const spain = { name: 'Spain', capital: 'Madrid' };
const staleResult = [{ name: 'Stale result for sp' }];

describe('request race', () => {
  let controlled: ReturnType<typeof createControlledFetch>;
  let states: SearchState[];

  beforeEach(() => {
    vi.useFakeTimers();
    controlled = createControlledFetch();
    vi.stubGlobal('fetch', controlled.fetchMock);
    states = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const create = () => {
    const controller = createSearchController({
      search: (query, signal) => searchCountries(query, signal),
      debounceMs: 300,
    });
    controller.subscribe((state) => states.push(state));
    return controller;
  };

  const flush = () => vi.advanceTimersByTimeAsync(0);

  it('shows only the latest query when the older response arrives late', async () => {
    const controller = create();

    controller.input('sp');
    await vi.advanceTimersByTimeAsync(300);
    controller.input('spain');
    await vi.advanceTimersByTimeAsync(300);

    controlled.respond(1, jsonResponse([spain]));
    await flush();
    controlled.respond(0, jsonResponse(staleResult));
    await flush();

    expect(controller.getState()).toMatchObject({
      status: 'success',
      query: 'spain',
    });
    expect(
      states.some(
        (state) => state.status === 'success' && state.query === 'sp',
      ),
    ).toBe(false);
    expect(controlled.calls[0]?.signal.aborted).toBe(true);
    expect(controlled.calls[1]?.signal.aborted).toBe(false);
  });

  it('aborts the in-flight request on every input, before the debounce fires', async () => {
    const controller = create();

    controller.input('s');
    await vi.advanceTimersByTimeAsync(300);
    expect(controlled.calls).toHaveLength(1);

    controller.input('sp');

    expect(controlled.calls[0]?.signal.aborted).toBe(true);
    expect(controlled.calls).toHaveLength(1);
  });

  it('does not show our own cancellation as an error', async () => {
    const controller = create();

    controller.input('s');
    await vi.advanceTimersByTimeAsync(300);
    controller.input('sp');
    await flush();

    expect(states.some((state) => state.status === 'error')).toBe(false);
  });

  it('cancels the request and goes idle when the field is cleared', async () => {
    const controller = create();

    controller.input('spain');
    await vi.advanceTimersByTimeAsync(300);
    controller.input('');
    await flush();

    expect(controlled.calls[0]?.signal.aborted).toBe(true);
    expect(controller.getState()).toEqual({ status: 'idle' });
  });
});
