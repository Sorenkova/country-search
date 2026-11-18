import { vi } from 'vitest';

interface PendingCall {
  url: string;
  signal: AbortSignal;
  resolve: (response: Response) => void;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

export function createControlledFetch() {
  const calls: PendingCall[] = [];

  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    return new Promise<Response>((resolve, reject) => {
      const signal = init?.signal;
      if (!signal) {
        reject(new Error('fetch must receive an AbortSignal'));
        return;
      }
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      signal.addEventListener('abort', () => reject(signal.reason), {
        once: true,
      });
      calls.push({ url, signal, resolve });
    });
  });

  const respond = (index: number, response: Response) => {
    const call = calls[index];
    if (!call) throw new Error(`No fetch call with index ${index}`);
    call.resolve(response);
  };

  return { fetchMock, calls, respond };
}
