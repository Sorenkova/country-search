import { HttpError } from './errors.js';
import { mapCountryResponse } from './mapCountryResponse.js';
const API_URL = 'https://countries.dev/name/';
export const REQUEST_TIMEOUT_MS = 8000;
export async function searchCountries(query, signal, timeoutMs = REQUEST_TIMEOUT_MS) {
    const requestSignal = AbortSignal.any([
        signal,
        AbortSignal.timeout(timeoutMs),
    ]);
    const response = await fetch(`${API_URL}${encodeURIComponent(query)}`, {
        signal: requestSignal,
    });
    if (response.status === 404)
        return [];
    if (!response.ok)
        throw new HttpError(response.status);
    const data = await response.json();
    return data.map((raw) => mapCountryResponse(raw));
}
