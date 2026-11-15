import { describe, expect, it } from 'vitest';
import { classifyError } from '../src/core/classifyError.js';
import { HttpError } from '../src/core/errors.js';

describe('classifyError', () => {
  it('recognizes our own cancellation as aborted', () => {
    const error = new DOMException('The operation was aborted', 'AbortError');

    expect(classifyError(error)).toBe('aborted');
  });

  it('recognizes a timeout and does not mix it up with abort', () => {
    const error = new DOMException('Timed out', 'TimeoutError');

    expect(classifyError(error)).toBe('timeout');
  });

  it('recognizes an HttpError', () => {
    expect(classifyError(new HttpError(500))).toBe('http');
  });

  it('treats a failed fetch (TypeError) as a network error', () => {
    expect(classifyError(new TypeError('Failed to fetch'))).toBe('network');
  });

  it('treats anything unknown as a network error', () => {
    expect(classifyError('boom')).toBe('network');
    expect(classifyError(undefined)).toBe('network');
  });
});
