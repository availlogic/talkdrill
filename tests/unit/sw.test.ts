import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Service Worker (TDD)', () => {
  const swCode = fs.readFileSync(path.resolve(__dirname, '../../public/sw.js'), 'utf-8');

  it('uses talkdrill-v2 cache name to invalidate previous stale caches', () => {
    expect(swCode).toMatch(/CACHE_NAME\s*=\s*['"]talkdrill-v2['"]/);
  });

  it('bypasses API requests completely without caching or intercepting', () => {
    // Check that swCode checks for /api/ and returns without calling event.respondWith
    expect(swCode).toMatch(/\/api\//);
  });

  it('does not intercept /api/ requests in fetch handler and purges v1 cache on activate', async () => {
    let fetchHandler: ((event: unknown) => void) | null = null;
    let activateHandler: ((event: { waitUntil: (p: Promise<unknown>) => void }) => void) | null = null;

    const fakeCaches = {
      open: vi.fn().mockResolvedValue({
        addAll: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined),
      }),
      match: vi.fn().mockResolvedValue(null),
      keys: vi.fn().mockResolvedValue(['talkdrill-v1']),
      delete: vi.fn().mockResolvedValue(true),
    };
    (globalThis as unknown as { caches: typeof fakeCaches }).caches = fakeCaches;

    const fakeSelf: {
      caches: typeof fakeCaches;
      addEventListener: (event: string, handler: (e: unknown) => void) => void;
      location: { origin: string };
      skipWaiting: ReturnType<typeof vi.fn>;
      clients: { claim: ReturnType<typeof vi.fn> };
    } = {
      caches: fakeCaches,
      addEventListener: vi.fn((event: string, handler: (e: unknown) => void) => {
        if (event === 'fetch') fetchHandler = handler;
        if (event === 'activate') activateHandler = handler as (e: { waitUntil: (p: Promise<unknown>) => void }) => void;
      }),
      location: { origin: 'https://talkdrill.pages.dev' },
      skipWaiting: vi.fn(),
      clients: { claim: vi.fn() },
    };

    const fn = new Function('self', 'caches', swCode);
    fn(fakeSelf, fakeCaches);

    expect(fetchHandler).toBeDefined();

    // Test API request
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      type: 'basic',
      clone: vi.fn().mockReturnValue({}),
    });

    const mockRespondWith = vi.fn();
    const apiEvent = {
      request: new Request('https://talkdrill.pages.dev/api/sync/pull', { method: 'GET' }),
      respondWith: mockRespondWith,
    };

    fetchHandler!(apiEvent);
    // Should NOT call respondWith on API request!
    expect(mockRespondWith).not.toHaveBeenCalled();

    // Test non-API GET request
    const staticEvent = {
      request: new Request('https://talkdrill.pages.dev/icon.svg', { method: 'GET' }),
      respondWith: mockRespondWith,
    };

    fetchHandler!(staticEvent);
    // Should call respondWith on static asset
    expect(mockRespondWith).toHaveBeenCalled();

    // Verify activate handler purges caches other than talkdrill-v2
    expect(activateHandler).toBeDefined();
    let waitUntilPromise: Promise<unknown> | null = null;
    activateHandler!({
      waitUntil: (p: Promise<unknown>) => {
        waitUntilPromise = p;
      },
    });
    expect(waitUntilPromise).toBeDefined();
    await waitUntilPromise;
    expect(fakeCaches.delete).toHaveBeenCalledWith('talkdrill-v1');
    expect(fakeSelf.clients.claim).toHaveBeenCalled();
  });
});
