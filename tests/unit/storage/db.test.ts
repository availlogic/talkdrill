import { describe, it, expect, beforeEach } from 'vitest';
import { db, TalkDrillDatabase } from '../../../src/storage/db';

describe('TalkDrillDatabase & Storage Layer', () => {
  beforeEach(async () => {
    await db.articles.clear();
    await db.audios.clear();
    await db.drillLogs.clear();
    await db.settings.clear();
    await db.wordLookups.clear();
  });

  it('initializes tables with correct schema', () => {
    expect(db).toBeInstanceOf(TalkDrillDatabase);
    expect(db.articles).toBeDefined();
    expect(db.audios).toBeDefined();
    expect(db.drillLogs).toBeDefined();
    expect(db.settings).toBeDefined();
    expect(db.wordLookups).toBeDefined();
  });

  it('can create, retrieve and query articles', async () => {
    const article = {
      id: 'art-001',
      title: 'Restaurante en Madrid',
      sourceText: 'Could we have the bill, please?',
      targetText: '¿Nos cobras, por favor?',
      sourceLang: 'en',
      targetLang: 'es-ES',
      mode: 'translate_needed' as const,
      targetCount: 500,
      currentCount: 12,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      isArchived: 0,
    };

    await db.articles.add(article);
    const fetched = await db.articles.get('art-001');

    expect(fetched).toBeDefined();
    expect(fetched?.title).toBe('Restaurante en Madrid');
    expect(fetched?.currentCount).toBe(12);

    // Query active articles
    const active = await db.articles.where('isArchived').equals(0).toArray();
    expect(active.length).toBe(1);
  });

  it('stores and retrieves binary audio blob without base64', async () => {
    const fakeBlob = new Blob(['mock-binary-audio-data'], { type: 'audio/mpeg' });
    const audio = {
      id: 'aud-001',
      articleId: 'art-001',
      blob: fakeBlob,
      mimeType: 'audio/mpeg',
      fileName: 'drill-audio.mp3',
      fileSize: fakeBlob.size,
      duration: 3.5,
      sourceType: 'tts' as const,
      createdAt: 1700000000000,
    };

    await db.audios.add(audio);
    const fetched = await db.audios.get('aud-001');

    expect(fetched).toBeDefined();
    expect(fetched?.blob).toBeInstanceOf(Blob);
    expect(fetched?.fileSize).toBe(fakeBlob.size);
  });

  it('performs atomic cascading deletion of article, audio, and drill logs', async () => {
    const articleId = 'art-cascade-test';

    await db.articles.add({
      id: articleId,
      title: 'Cascade Test',
      sourceText: 'Source',
      targetText: 'Target',
      sourceLang: 'en',
      targetLang: 'es-ES',
      mode: 'translate_needed',
      targetCount: 500,
      currentCount: 3,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      isArchived: 0,
    });

    await db.audios.add({
      id: 'aud-cascade',
      articleId,
      blob: new Blob(['audio']),
      mimeType: 'audio/mpeg',
      fileName: 'test.mp3',
      fileSize: 5,
      duration: 1.0,
      sourceType: 'upload',
      createdAt: 1700000000000,
    });

    await db.drillLogs.bulkAdd([
      { articleId, delta: 1, resultingCount: 1, timestamp: 1700000001000 },
      { articleId, delta: 1, resultingCount: 2, timestamp: 1700000002000 },
      { articleId, delta: 1, resultingCount: 3, timestamp: 1700000003000 },
    ]);

    // Verify presence before delete
    expect(await db.articles.get(articleId)).toBeDefined();
    expect(await db.audios.where('articleId').equals(articleId).count()).toBe(1);
    expect(await db.drillLogs.where('articleId').equals(articleId).count()).toBe(3);

    // Execute cascading delete
    await db.deleteArticleCascade(articleId);

    // Verify atomic deletion
    expect(await db.articles.get(articleId)).toBeUndefined();
    expect(await db.audios.where('articleId').equals(articleId).count()).toBe(0);
    expect(await db.drillLogs.where('articleId').equals(articleId).count()).toBe(0);
  });

  it('exports and applies sync snapshot seamlessly', async () => {
    const article = {
      id: 'art-sync-1',
      title: 'Sync Test',
      sourceText: 'Source',
      targetText: 'Target',
      sourceLang: 'en',
      targetLang: 'es',
      mode: 'direct_foreign' as const,
      targetCount: 100,
      currentCount: 5,
      createdAt: 1000,
      updatedAt: 1000,
      isArchived: 0,
    };
    await db.articles.add(article);
    await db.drillLogs.add({
      articleId: 'art-sync-1',
      delta: 1,
      resultingCount: 1,
      timestamp: 1005,
    });
    await db.audios.add({
      id: 'aud-sync-1',
      articleId: 'art-sync-1',
      blob: new Blob(['audio']),
      mimeType: 'audio/mpeg',
      fileName: 'test.mp3',
      fileSize: 5,
      duration: 1,
      sourceType: 'tts',
      createdAt: 1000,
    });
    await db.wordLookups.add({
      lang: 'en',
      text: 'apple',
      translation: 'fruit',
      source: 'cache',
      timestamp: 1000,
    });

    const snapshot = await db.exportSnapshot();
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.articles).toHaveLength(1);
    expect(snapshot.drillLogs).toHaveLength(1);
    expect(snapshot.audioMetas).toHaveLength(1);
    expect(snapshot.wordLookups).toHaveLength(1);
    expect(snapshot.articles[0].id).toBe('art-sync-1');

    await db.clearAllData();
    expect(await db.articles.count()).toBe(0);
    expect(await db.drillLogs.count()).toBe(0);

    await db.applyMergedSnapshot(snapshot);
    expect(await db.articles.count()).toBe(1);
    expect(await db.drillLogs.count()).toBe(1);
    const restored = await db.articles.get('art-sync-1');
    expect(restored?.title).toBe('Sync Test');
  });

  it('self-heals missing article.audioId from audios table during exportSnapshot', async () => {
    await db.articles.add({
      id: 'art-no-audio-id',
      title: 'Missing Audio ID',
      sourceText: '',
      targetText: 'Hello',
      sourceLang: 'en',
      targetLang: 'es',
      mode: 'direct_foreign',
      targetCount: 100,
      currentCount: 0,
      // audioId intentionally omitted / undefined
      createdAt: 1000,
      updatedAt: 1000,
      isArchived: 0,
    });

    await db.audios.add({
      id: 'aud-healing-1',
      articleId: 'art-no-audio-id',
      blob: new Blob(['audio']),
      mimeType: 'audio/mpeg',
      fileName: 'healing.mp3',
      fileSize: 10,
      duration: 1,
      sourceType: 'tts',
      createdAt: 1000,
    });

    const snapshot = await db.exportSnapshot();
    const exportedArt = snapshot.articles.find((a) => a.id === 'art-no-audio-id');
    expect(exportedArt?.audioId).toBe('aud-healing-1');

    // Local database should also be healed
    const localArt = await db.articles.get('art-no-audio-id');
    expect(localArt?.audioId).toBe('aud-healing-1');
  });

  it('links missing article.audioId from snapshot.audioMetas in applyMergedSnapshot', async () => {
    const remoteSnapshot = {
      schemaVersion: 1,
      exportedAt: 1000,
      articles: [{
        id: 'art-remote-no-audio-id',
        title: 'Remote Art',
        sourceText: '',
        targetText: 'Remote',
        sourceLang: 'en',
        targetLang: 'es',
        mode: 'direct_foreign' as const,
        targetCount: 100,
        currentCount: 0,
        createdAt: 1000,
        updatedAt: 1000,
        isArchived: 0,
      }],
      drillLogs: [],
      settings: [],
      audioMetas: [{
        id: 'aud-remote-meta-1',
        articleId: 'art-remote-no-audio-id',
        mimeType: 'audio/mpeg',
        fileName: 'remote.mp3',
        fileSize: 20,
        duration: 2,
        sourceType: 'tts' as const,
        createdAt: 1000,
      }],
    };

    await db.applyMergedSnapshot(remoteSnapshot);
    const appliedArt = await db.articles.get('art-remote-no-audio-id');
    expect(appliedArt?.audioId).toBe('aud-remote-meta-1');
  });
});

