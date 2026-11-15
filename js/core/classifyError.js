import { HttpError } from './errors.js';
export function classifyError(error) {
    if (error instanceof HttpError)
        return 'http';
    const name = error instanceof Error ? error.name : '';
    if (name === 'AbortError')
        return 'aborted';
    if (name === 'TimeoutError')
        return 'timeout';
    return 'network';
}
