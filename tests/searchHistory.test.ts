import { describe, expect, it } from 'vitest';
import {
  createSearchHistory,
  type StorageLike,
} from '../src/core/searchHistory.js';

function createMemoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: StorageLike = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
  return { storage, data };
}

const brokenStorage: StorageLike = {
  getItem: () => {
    throw new Error('storage is blocked');
  },
  setItem: () => {
    throw new Error('storage is blocked');
  },
};

describe('createSearchHistory', () => {
  it('starts empty', () => {
    const { storage } = createMemoryStorage();

    expect(createSearchHistory(storage).get()).toEqual([]);
  });

  it('puts the newest query first', () => {
    const history = createSearchHistory(createMemoryStorage().storage);

    history.add('spain');
    history.add('italy');

    expect(history.get()).toEqual(['italy', 'spain']);
  });

  it('moves a repeated query to the top without duplicates, ignoring case', () => {
    const history = createSearchHistory(createMemoryStorage().storage);

    history.add('spain');
    history.add('italy');
    history.add('SPAIN');

    expect(history.get()).toEqual(['SPAIN', 'italy']);
  });

  it('trims the query and ignores blank ones', () => {
    const history = createSearchHistory(createMemoryStorage().storage);

    history.add('  peru  ');
    history.add('   ');
    history.add('');

    expect(history.get()).toEqual(['peru']);
  });

  it('keeps only the latest queries up to the limit', () => {
    const history = createSearchHistory(createMemoryStorage().storage, {
      limit: 3,
    });

    ['a', 'b', 'c', 'd'].forEach((query) => history.add(query));

    expect(history.get()).toEqual(['d', 'c', 'b']);
  });

  it('survives a reload: a new instance reads what the old one saved', () => {
    const { storage } = createMemoryStorage();

    createSearchHistory(storage).add('spain');

    expect(createSearchHistory(storage).get()).toEqual(['spain']);
  });

  it('returns the new list from add()', () => {
    const history = createSearchHistory(createMemoryStorage().storage);

    expect(history.add('spain')).toEqual(['spain']);
  });

  it('ignores corrupted or unexpected stored data', () => {
    const key = 'country-search:history';

    expect(
      createSearchHistory(
        createMemoryStorage({ [key]: '{oops' }).storage,
      ).get(),
    ).toEqual([]);
    expect(
      createSearchHistory(
        createMemoryStorage({ [key]: '{"a":1}' }).storage,
      ).get(),
    ).toEqual([]);
    expect(
      createSearchHistory(
        createMemoryStorage({ [key]: '["spain", 5, null, "peru"]' }).storage,
      ).get(),
    ).toEqual(['spain', 'peru']);
  });

  it('does not crash when the storage is unavailable', () => {
    const history = createSearchHistory(brokenStorage);

    expect(history.get()).toEqual([]);
    expect(history.add('spain')).toEqual(['spain']);
  });
});
