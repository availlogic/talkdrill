import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onRequestGet as onManifestGet, onRequestOptions as onManifestOptions } from '../../../functions/api/sync/manifest';
import { onRequestGet as onPullGet, onRequestOptions as onPullOptions } from '../../../functions/api/sync/pull';
import { onRequestPost as onPushPost, onRequestOptions as onPushOptions } from '../../../functions/api/sync/push';
import {
  onRequestGet as onAudioGet,
  onRequestPut as onAudioPut,
  onRequestOptions as onAudioOptions,
} from '../../../functions/api/sync/audio/[id]';

interface MockR2Bucket {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  head: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

describe('Cloudflare Sync Pages Functions (TDD)', () => {
  const validSyncKey = 'TD-9X7K-M2P4-W8N3-7B5D';
  let mockBucket: MockR2Bucket;

  beforeEach(() => {
    mockBucket = {
      get: vi.fn(),
      put: vi.fn(),
      head: vi.fn(),
      delete: vi.fn(),
    };
  });

  describe('CORS Options', () => {
    it('returns 204 with CORS headers for all endpoints', async () => {
      const res1 = await onManifestOptions();
      const res2 = await onPullOptions();
      const res3 = await onPushOptions();
      const res4 = await onAudioOptions();

      expect(res1.status).toBe(204);
      expect(res2.status).toBe(204);
      expect(res3.status).toBe(204);
      expect(res4.status).toBe(204);
      expect(res1.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res1.headers.get('Access-Control-Allow-Headers')).toContain('x-sync-key');
    });
  });

  describe('Authentication & Key Validation', () => {
    it('returns 401 when x-sync-key is missing', async () => {
      const req = new Request('https://talkdrill.pages.dev/api/sync/manifest');
      const res = await onManifestGet({ request: req, env: { TALKDRILL_BUCKET: mockBucket } } as never);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json).toEqual({ error: 'Missing or invalid x-sync-key' });
    });

    it('returns 401 when x-sync-key format is invalid', async () => {
      const req = new Request('https://talkdrill.pages.dev/api/sync/manifest', {
        headers: { 'x-sync-key': 'invalid-key-format' },
      });
      const res = await onManifestGet({ request: req, env: { TALKDRILL_BUCKET: mockBucket } } as never);
      expect(res.status).toBe(401);
    });

    it('returns 500 when R2 bucket is not configured', async () => {
      const req = new Request('https://talkdrill.pages.dev/api/sync/manifest', {
        headers: { 'x-sync-key': validSyncKey },
      });
      const res = await onManifestGet({ request: req, env: {} } as never);
      expect(res.status).toBe(500);
    });
  });

  describe('/api/sync/manifest', () => {
    it('returns exists: false when manifest is not found in R2', async () => {
      mockBucket.get.mockResolvedValue(null);
      const req = new Request('https://talkdrill.pages.dev/api/sync/manifest', {
        headers: { 'x-sync-key': validSyncKey },
      });

      const res = await onManifestGet({ request: req, env: { TALKDRILL_BUCKET: mockBucket } } as never);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ exists: false, updatedAt: 0 });
    });

    it('returns parsed manifest JSON when present in R2', async () => {
      const manifest = { exists: true, updatedAt: 12345678, articleCount: 5 };
      mockBucket.get.mockResolvedValue({
        json: vi.fn().mockResolvedValue(manifest),
      });

      const req = new Request('https://talkdrill.pages.dev/api/sync/manifest', {
        headers: { 'x-sync-key': validSyncKey },
      });

      const res = await onManifestGet({ request: req, env: { TALKDRILL_BUCKET: mockBucket } } as never);
      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate');
      const data = await res.json();
      expect(data).toEqual(manifest);
    });
  });

  describe('/api/sync/pull', () => {
    it('returns 404 when snapshot is not found in R2', async () => {
      mockBucket.get.mockResolvedValue(null);
      const req = new Request('https://talkdrill.pages.dev/api/sync/pull', {
        headers: { 'x-sync-key': validSyncKey },
      });

      const res = await onPullGet({ request: req, env: { TALKDRILL_BUCKET: mockBucket } } as never);
      expect(res.status).toBe(404);
    });

    it('returns snapshot JSON when found in R2', async () => {
      const snapshot = { schemaVersion: 1, exportedAt: 1000, articles: [], drillLogs: [], settings: [] };
      mockBucket.get.mockResolvedValue({
        json: vi.fn().mockResolvedValue(snapshot),
      });

      const req = new Request('https://talkdrill.pages.dev/api/sync/pull', {
        headers: { 'x-sync-key': validSyncKey },
      });

      const res = await onPullGet({ request: req, env: { TALKDRILL_BUCKET: mockBucket } } as never);
      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate');
      const data = await res.json();
      expect(data).toEqual(snapshot);
    });
  });

  describe('/api/sync/push', () => {
    it('rejects invalid payload body', async () => {
      const req = new Request('https://talkdrill.pages.dev/api/sync/push', {
        method: 'POST',
        headers: { 'x-sync-key': validSyncKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'payload' }),
      });

      const res = await onPushPost({ request: req, env: { TALKDRILL_BUCKET: mockBucket } } as never);
      expect(res.status).toBe(400);
    });

    it('stores snapshot and manifest in R2 upon valid payload', async () => {
      const snapshot = {
        schemaVersion: 1,
        exportedAt: 5000,
        articles: [{ id: 'a1' }],
        drillLogs: [],
        settings: [],
      };
      const req = new Request('https://talkdrill.pages.dev/api/sync/push', {
        method: 'POST',
        headers: { 'x-sync-key': validSyncKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      });

      const res = await onPushPost({ request: req, env: { TALKDRILL_BUCKET: mockBucket } } as never);
      expect(res.status).toBe(200);
      expect(mockBucket.put).toHaveBeenCalledTimes(2); // snapshot.json & manifest.json
    });
  });

  describe('/api/sync/audio/[id]', () => {
    it('returns 404 when audio file is not found in R2', async () => {
      mockBucket.get.mockResolvedValue(null);
      const req = new Request('https://talkdrill.pages.dev/api/sync/audio/aud-123', {
        headers: { 'x-sync-key': validSyncKey },
      });

      const res = await onAudioGet({
        request: req,
        params: { id: 'aud-123' },
        env: { TALKDRILL_BUCKET: mockBucket },
      } as never);
      expect(res.status).toBe(404);
    });

    it('streams audio content from R2 when present', async () => {
      const mockStream = new ReadableStream();
      mockBucket.get.mockResolvedValue({
        body: mockStream,
        httpMetadata: { contentType: 'audio/mpeg' },
      });

      const req = new Request('https://talkdrill.pages.dev/api/sync/audio/aud-123', {
        headers: { 'x-sync-key': validSyncKey },
      });

      const res = await onAudioGet({
        request: req,
        params: { id: 'aud-123' },
        env: { TALKDRILL_BUCKET: mockBucket },
      } as never);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
    });

    it('stores audio file in R2 on PUT', async () => {
      const audioBytes = new Uint8Array([1, 2, 3, 4]);
      const req = new Request('https://talkdrill.pages.dev/api/sync/audio/aud-123', {
        method: 'PUT',
        headers: { 'x-sync-key': validSyncKey, 'Content-Type': 'audio/mpeg' },
        body: audioBytes,
      });

      const res = await onAudioPut({
        request: req,
        params: { id: 'aud-123' },
        env: { TALKDRILL_BUCKET: mockBucket },
      } as never);

      expect(res.status).toBe(200);
      expect(mockBucket.put).toHaveBeenCalledWith(
        expect.stringContaining('aud-123'),
        expect.anything(),
        expect.objectContaining({ httpMetadata: { contentType: 'audio/mpeg' } })
      );
    });
  });
});
