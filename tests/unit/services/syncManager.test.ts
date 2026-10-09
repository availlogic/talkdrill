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

      const localArticles = await db.articles.toArray();
      expect(localArticles).toHaveLength(1);
      expect(localArticles[0].id).toBe('art-remote');
    });

    it('sets error status when sync fails due to network or server error', async () => {
      manager.setSyncKey(validKey);
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await manager.syncNow();
      expect(result.success).toBe(false);
      expect(manager.getState().status).toBe('error');
      expect(manager.getState().errorMessage).toContain('Network error');
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
