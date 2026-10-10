import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncManager } from '../../../src/services/syncManager';
import { db } from '../../../src/storage/db';

describe('SyncManager (TDD)', () => {
  let manager: SyncManager;
  const validKey = 'TD-9X7K-M2P4-W8N3-7B5D';

  beforeEach(async () => {
    localStorage.clear();
    await db.clearAllData();
    vi.restoreAllMocks();
    manager = new SyncManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Key management and state', () => {
    it('initializes without sync key by default', () => {
      expect(manager.getSyncKey()).toBeNull();
      expect(manager.getState().status).toBe('idle');
    });

    it('sets and persists valid sync key and notifies listeners', () => {
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.setSyncKey(validKey);
      expect(manager.getSyncKey()).toBe(validKey);
      expect(localStorage.getItem('talkdrill_sync_key')).toBe(validKey);
      expect(listener).toHaveBeenCalled();
    });

    it('clears sync key and resets state', () => {
      manager.setSyncKey(validKey);
      manager.clearSyncKey();
      expect(manager.getSyncKey()).toBeNull();
      expect(localStorage.getItem('talkdrill_sync_key')).toBeNull();
    });
  });

  describe('syncNow workflow', () => {
    it('returns early when no sync key is set', async () => {
      const result = await manager.syncNow();
      expect(result.success).toBe(false);
      expect(result.reason).toBe('no_key');
    });

    it('pushes local snapshot when remote has no data yet (first sync)', async () => {
      manager.setSyncKey(validKey);

      const mockFetch = vi.fn()
        // 1. GET /api/sync/manifest
        .mockResolvedValueOnce(new Response(JSON.stringify({ exists: false, updatedAt: 0 }), { status: 200 }))
        // 2. POST /api/sync/push
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, updatedAt: 5000 }), { status: 200 }));
      globalThis.fetch = mockFetch;

      const result = await manager.syncNow();
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(manager.getState().lastSyncedAt).toBeGreaterThan(0);
    });

    it('pulls, merges, updates local db and pushes back when remote data exists', async () => {
      manager.setSyncKey(validKey);

      const remoteSnapshot = {
        schemaVersion: 1,
        exportedAt: 5000,
        articles: [{
          id: 'art-remote',
          title: 'Remote Article',
          sourceText: 'Hello',
          targetText: 'Bonjour',
          sourceLang: 'en',
          targetLang: 'fr',
          mode: 'bilingual',
          targetCount: 10,
          currentCount: 3,
          createdAt: 5000,
          updatedAt: 5000,
          isArchived: 0,
        }],
        drillLogs: [],
        settings: [],
      };

      const mockFetch = vi.fn()
        // 1. GET /api/sync/manifest
        .mockResolvedValueOnce(new Response(JSON.stringify({ exists: true, updatedAt: 5000 }), { status: 200 }))
        // 2. GET /api/sync/pull
        .mockResolvedValueOnce(new Response(JSON.stringify(remoteSnapshot), { status: 200 }))
        // 3. POST /api/sync/push
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, updatedAt: 5000 }), { status: 200 }));
      globalThis.fetch = mockFetch;

      const result = await manager.syncNow();
      expect(result.success).toBe(true);

      expect(mockFetch).toHaveBeenCalledWith('/api/sync/manifest', expect.objectContaining({ cache: 'no-store' }));
      expect(mockFetch).toHaveBeenCalledWith('/api/sync/pull', expect.objectContaining({ cache: 'no-store' }));

      const localArticles = await db.articles.toArray();
      expect(localArticles).toHaveLength(1);
      expect(localArticles[0].id).toBe('art-remote');
    });

    it('merges remote newer counts (e.g. 353) into local older counts (e.g. 311) without regression', async () => {
      manager.setSyncKey(validKey);

      await db.articles.add({
        id: 'art-drill-1',
        title: 'Shadowing 1',
        sourceText: '',
        targetText: 'Hello world',
        sourceLang: 'en',
        targetLang: 'en',
        mode: 'direct_foreign',
        targetCount: 500,
        currentCount: 311,
        createdAt: 1000,
        updatedAt: 1000,
        isArchived: 0,
      });

      const remoteSnapshot = {
        schemaVersion: 1,
        exportedAt: 2000,
        articles: [{
          id: 'art-drill-1',
          title: 'Shadowing 1',
          sourceText: '',
          targetText: 'Hello world',
          sourceLang: 'en',
          targetLang: 'en',
          mode: 'direct_foreign' as const,
          targetCount: 500,
          currentCount: 353,
          createdAt: 1000,
          updatedAt: 2000,
          isArchived: 0,
        }],
        drillLogs: [
          { articleId: 'art-drill-1', delta: 1, resultingCount: 353, timestamp: 2000 },
        ],
        settings: [],
      };

      const mockFetch = vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ exists: true, updatedAt: 2000 }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(remoteSnapshot), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, updatedAt: 2000 }), { status: 200 }));
      globalThis.fetch = mockFetch;

      const result = await manager.syncNow();
      expect(result.success).toBe(true);

      const localArt = await db.articles.get('art-drill-1');
      expect(localArt?.currentCount).toBe(353);

      // Verify that if pushed, payload contains 353, never 311
      const pushCall = mockFetch.mock.calls.find((call) => call[0] === '/api/sync/push');
      if (pushCall) {
        const payload = JSON.parse(pushCall[1].body);
        expect(payload.articles[0].currentCount).toBe(353);
      }
    });

    it('sets error status when sync fails due to network or server error', async () => {
      manager.setSyncKey(validKey);
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await manager.syncNow();
      expect(result.success).toBe(false);
      expect(manager.getState().status).toBe('error');
      expect(manager.getState().errorMessage).toContain('Network error');
    });

    it('uploads unsynced local audios to /api/sync/audio/[id] and marks them as synced', async () => {
      manager.setSyncKey(validKey);

      await db.audios.add({
        id: 'aud-unsynced-1',
        articleId: 'art-1',
        blob: new Blob(['audio-content'], { type: 'audio/mpeg' }),
        mimeType: 'audio/mpeg',
        fileName: 'test.mp3',
        fileSize: 13,
        duration: 1,
        sourceType: 'tts',
        createdAt: 1000,
        synced: false,
      });

      const mockFetch = vi.fn()
        // 1. GET /api/sync/manifest
        .mockResolvedValueOnce(new Response(JSON.stringify({ exists: false, updatedAt: 0 }), { status: 200 }))
        // 2. POST /api/sync/push
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, updatedAt: 5000 }), { status: 200 }))
        // 3. PUT /api/sync/audio/aud-unsynced-1
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
      globalThis.fetch = mockFetch;

      const result = await manager.syncNow();
      expect(result.success).toBe(true);

      // Verify PUT call
      const putCall = mockFetch.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('/api/sync/audio/aud-unsynced-1')
      );
      expect(putCall).toBeDefined();
      expect(putCall?.[1]?.method).toBe('PUT');
      expect(putCall?.[1]?.headers?.['x-sync-key']).toBe(validKey);

      // Verify marked as synced in IndexedDB
      const updatedAudio = await db.audios.get('aud-unsynced-1');
      expect(updatedAudio?.synced).toBe(true);
    });

    it('skips uploading already synced audios', async () => {
      manager.setSyncKey(validKey);

      await db.audios.add({
        id: 'aud-synced-already',
        articleId: 'art-1',
        blob: new Blob(['audio-content'], { type: 'audio/mpeg' }),
        mimeType: 'audio/mpeg',
        fileName: 'test.mp3',
        fileSize: 13,
        duration: 1,
        sourceType: 'tts',
        createdAt: 1000,
        synced: true,
      });

      const mockFetch = vi.fn()
        // 1. GET /api/sync/manifest
        .mockResolvedValueOnce(new Response(JSON.stringify({ exists: false, updatedAt: 0 }), { status: 200 }))
        // 2. POST /api/sync/push
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, updatedAt: 5000 }), { status: 200 }));
      globalThis.fetch = mockFetch;

      const result = await manager.syncNow();
      expect(result.success).toBe(true);

      const putCalls = mockFetch.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].includes('/api/sync/audio/')
      );
      expect(putCalls).toHaveLength(0);
    });
  });

  describe('Debounced sync scheduling', () => {
    it('debounces multiple calls into a single execution', async () => {
      manager.setSyncKey(validKey);
      const syncSpy = vi.spyOn(manager, 'syncNow').mockResolvedValue({ success: true });

      manager.scheduleSync(50);
      manager.scheduleSync(50);
      manager.scheduleSync(50);

      await new Promise((resolve) => setTimeout(resolve, 80));
      expect(syncSpy).toHaveBeenCalledTimes(1);
    });
  });
});
