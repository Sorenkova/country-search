import type { Country, RawCountry } from './types.js';

function describe(raw: RawCountry): string {
  const nativeName =
    raw.nativeName && raw.nativeName !== raw.name ? ` (${raw.nativeName})` : '';
  const place = raw.subregion || raw.region;

  return place
    ? `${raw.name}${nativeName} — ${place}`
    : `${raw.name}${nativeName}`;
}

export function mapCountryResponse(raw: RawCountry): Country {
  return {
    name: raw.name,
    nativeName: raw.nativeName ?? '',
    demonym: raw.demonym ?? '',
    flag: raw.flags?.svg ?? raw.flags?.png ?? raw.flag ?? '',
    capital: raw.capital ?? '—',
    region: raw.region ?? '',
    subregion: raw.subregion ?? '',
    population: raw.population ?? 0,
    area: raw.area ?? 0,
    borders: [...(raw.borders ?? [])],
    languages: (raw.languages ?? []).map((language) => language.name),
    currencies: (raw.currencies ?? []).map(({ name, symbol }) =>
      symbol ? `${name} (${symbol})` : name,
    ),
    description: describe(raw),
  };
}
