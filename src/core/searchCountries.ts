import { HttpError } from './errors.js';
import { mapCountryResponse } from './mapCountryResponse.js';
import type { Country, RawCountry } from './types.js';

const API_URL = 'https://countries.dev/name/';
export const REQUEST_TIMEOUT_MS = 8000;

export async function searchCountries(
  query: string,
  signal: AbortSignal,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Country[]> {
  const requestSignal = AbortSignal.any([
    signal,
    AbortSignal.timeout(timeoutMs),
  ]);

  const response = await fetch(`${API_URL}${encodeURIComponent(query)}`, {
    signal: requestSignal,
  });

  if (response.status === 404) return [];
  if (!response.ok) throw new HttpError(response.status);

  const data: RawCountry[] = await response.json();

  return data.map((raw) => mapCountryResponse(raw));
}
