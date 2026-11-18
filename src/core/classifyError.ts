import { HttpError } from './errors.js';

export type FailureKind = 'aborted' | 'timeout' | 'http' | 'network';

export function classifyError(error: unknown): FailureKind {
  if (error instanceof HttpError) return 'http';

  const name = error instanceof Error ? error.name : '';
  if (name === 'AbortError') return 'aborted';
  if (name === 'TimeoutError') return 'timeout';

  return 'network';
}
