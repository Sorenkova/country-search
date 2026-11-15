import { describe, expect, it } from 'vitest';
import { mapCountryResponse } from '../src/core/mapCountryResponse.js';

// A trimmed real answer of https://countries.dev/name/spain
const spain = {
  area: 505992,
  flag: '🇪🇸',
  name: 'Spain',
  flags: {
    png: 'https://flagcdn.com/w320/es.png',
    svg: 'https://flagcdn.com/es.svg',
  },
  region: 'Europe',
  borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
  capital: 'Madrid',
  demonym: 'Spanish',
  languages: [
    { name: 'Spanish', iso639_1: 'es', iso639_2: 'spa', nativeName: 'Español' },
  ],
  subregion: 'Southern Europe',
  currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
  nativeName: 'España',
  population: 47351567,
};

describe('mapCountryResponse', () => {
  it('maps the basic card fields', () => {
    const card = mapCountryResponse(spain);

    expect(card.name).toBe('Spain');
    expect(card.capital).toBe('Madrid');
    expect(card.region).toBe('Europe');
    expect(card.population).toBe(47351567);
  });

  it('prefers the svg flag url over the png and the emoji', () => {
    expect(mapCountryResponse(spain).flag).toBe('https://flagcdn.com/es.svg');
  });

  it('falls back to png, then to the emoji flag', () => {
    const pngOnly = {
      ...spain,
      flags: { png: 'https://flagcdn.com/w320/es.png' },
    };
    const emojiOnly = { ...spain, flags: undefined };

    expect(mapCountryResponse(pngOnly).flag).toBe(
      'https://flagcdn.com/w320/es.png',
    );
    expect(mapCountryResponse(emojiOnly).flag).toBe('🇪🇸');
  });

  it('turns languages and currencies into plain string lists', () => {
    const card = mapCountryResponse(spain);

    expect(card.languages).toEqual(['Spanish']);
    expect(card.currencies).toEqual(['Euro (€)']);
  });

  it('keeps the detail fields', () => {
    const card = mapCountryResponse(spain);

    expect(card.area).toBe(505992);
    expect(card.borders).toEqual(['AND', 'FRA', 'GIB', 'PRT', 'MAR']);
    expect(card.demonym).toBe('Spanish');
    expect(card.nativeName).toBe('España');
  });

  it('builds the description from the name and the place, because the api has none', () => {
    expect(mapCountryResponse(spain).description).toBe(
      'Spain (España) — Southern Europe',
    );
    expect(
      mapCountryResponse({ name: 'Peru', nativeName: 'Peru' }).description,
    ).toBe('Peru');
  });

  it('uses safe defaults when optional fields are missing', () => {
    const card = mapCountryResponse({ name: 'Nowhere' });

    expect(card.capital).toBe('—');
    expect(card.flag).toBe('');
    expect(card.languages).toEqual([]);
    expect(card.currencies).toEqual([]);
    expect(card.borders).toEqual([]);
    expect(card.population).toBe(0);
  });

  it('does not mutate the input', () => {
    const raw = structuredClone(spain);

    mapCountryResponse(raw);

    expect(raw).toEqual(spain);
  });
});
