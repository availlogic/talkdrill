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
});
