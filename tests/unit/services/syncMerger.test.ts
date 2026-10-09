import { describe, it, expect } from 'vitest';
import { mergeSnapshots, type SyncSnapshot } from '../../../src/services/syncMerger';
import { type ArticleRecord, type SettingsRecord } from '../../../src/storage/db';

describe('syncMerger (TDD)', () => {
  const baseArticle: ArticleRecord = {
    id: 'art-1',
    title: 'Hello World',
    sourceText: 'Hello',
    targetText: 'Bonjour',
    sourceLang: 'en',
    targetLang: 'fr',
    mode: 'direct_foreign',
    targetCount: 10,
    currentCount: 2,
    createdAt: 1000,
    updatedAt: 1000,
    isArchived: 0,
  };

  const emptySnapshot: SyncSnapshot = {
    schemaVersion: 1,
    exportedAt: 1000,
    articles: [],
    drillLogs: [],
    settings: [],
  };

  it('handles merging empty snapshots cleanly', () => {
    const result = mergeSnapshots(emptySnapshot, emptySnapshot);
    expect(result.mergedSnapshot.articles).toEqual([]);
    expect(result.mergedSnapshot.drillLogs).toEqual([]);
    expect(result.stats.articlesAdded).toBe(0);
    expect(result.stats.drillLogsAdded).toBe(0);
  });

  it('pulls remote-only articles into local', () => {
    const remote: SyncSnapshot = {
      ...emptySnapshot,
      articles: [baseArticle],
    };
    const result = mergeSnapshots(emptySnapshot, remote);
    expect(result.mergedSnapshot.articles).toHaveLength(1);
    expect(result.mergedSnapshot.articles[0].id).toBe('art-1');
    expect(result.stats.articlesAdded).toBe(1);
  });

  it('preserves local-only articles that do not exist on remote', () => {
    const local: SyncSnapshot = {
      ...emptySnapshot,
      articles: [baseArticle],
    };
    const result = mergeSnapshots(local, emptySnapshot);
    expect(result.mergedSnapshot.articles).toHaveLength(1);
    expect(result.mergedSnapshot.articles[0].id).toBe('art-1');
    expect(result.stats.articlesAdded).toBe(0);
  });

  it('resolves conflicting articles via LWW based on updatedAt', () => {
    const local: SyncSnapshot = {
      ...emptySnapshot,
      articles: [{ ...baseArticle, title: 'Local Older', updatedAt: 2000 }],
    };
    const remote: SyncSnapshot = {
      ...emptySnapshot,
      articles: [{ ...baseArticle, title: 'Remote Newer', updatedAt: 3000 }],
    };
    const result = mergeSnapshots(local, remote);
    expect(result.mergedSnapshot.articles[0].title).toBe('Remote Newer');
    expect(result.mergedSnapshot.articles[0].updatedAt).toBe(3000);
    expect(result.stats.articlesUpdated).toBe(1);
  });

  it('unions drill logs without losing offline logs from either side', () => {
    const local: SyncSnapshot = {
      ...emptySnapshot,
      drillLogs: [
        { articleId: 'art-1', delta: 1, resultingCount: 1, timestamp: 1010 },
        { articleId: 'art-1', delta: 1, resultingCount: 2, timestamp: 1020 },
      ],
    };
    const remote: SyncSnapshot = {
      ...emptySnapshot,
      drillLogs: [
        { articleId: 'art-1', delta: 1, resultingCount: 1, timestamp: 1010 }, // Duplicate
        { articleId: 'art-1', delta: 1, resultingCount: 3, timestamp: 1030 }, // Remote new
      ],
    };

    const result = mergeSnapshots(local, remote);
    expect(result.mergedSnapshot.drillLogs).toHaveLength(3);
    expect(result.mergedSnapshot.drillLogs.map((l) => l.timestamp)).toEqual([1010, 1020, 1030]);
    expect(result.stats.drillLogsAdded).toBe(1);
  });

  it('updates article currentCount to the maximum count between logs and instances', () => {
    const local: SyncSnapshot = {
      ...emptySnapshot,
      articles: [{ ...baseArticle, currentCount: 5, lastPracticedAt: 2000 }],
    };
    const remote: SyncSnapshot = {
      ...emptySnapshot,
      articles: [{ ...baseArticle, currentCount: 8, lastPracticedAt: 3000 }],
    };
    const result = mergeSnapshots(local, remote);
    expect(result.mergedSnapshot.articles[0].currentCount).toBe(8);
    expect(result.mergedSnapshot.articles[0].lastPracticedAt).toBe(3000);
  });

  it('merges settings by taking the newest updatedAt per key', () => {
    const localSetting: SettingsRecord = {
      key: 'app_settings',
      value: {
        theme: 'light',
        translation: { enabled: true, baseUrl: '', apiKey: '', model: '' },
        tts: { provider: 'openai', baseUrl: '', apiKey: '', modelOrVoiceId: '' },
        printOptions: { defaultTallyBoxes: 60 },
        dictionary: { hotkey: 'Alt', cacheTtlDays: 2 },
      },
      updatedAt: 1000,
    };
    const remoteSetting: SettingsRecord = {
      key: 'app_settings',
      value: {
        theme: 'dark',
        translation: { enabled: true, baseUrl: '', apiKey: '', model: '' },
        tts: { provider: 'openai', baseUrl: '', apiKey: '', modelOrVoiceId: '' },
        printOptions: { defaultTallyBoxes: 100 },
        dictionary: { hotkey: 'Alt', cacheTtlDays: 7 },
      },
      updatedAt: 2000,
    };
    const local: SyncSnapshot = { ...emptySnapshot, settings: [localSetting] };
    const remote: SyncSnapshot = { ...emptySnapshot, settings: [remoteSetting] };

    const result = mergeSnapshots(local, remote);
    expect(result.mergedSnapshot.settings).toHaveLength(1);
    expect(result.mergedSnapshot.settings[0].value.theme).toBe('dark');
    expect(result.stats.settingsUpdated).toBe(1);
  });

  it('merges word lookups keeping the latest timestamp', () => {
    const local = {
      ...emptySnapshot,
      wordLookups: [
        { lang: 'en', text: 'apple', translation: 'fruit', source: 'cache' as const, timestamp: 100 },
        { lang: 'en', text: 'banana', translation: 'yellow fruit', source: 'api' as const, timestamp: 100 },
      ],
    };
    const remote = {
      ...emptySnapshot,
      wordLookups: [
        { lang: 'en', text: 'apple', translation: 'delicious fruit', source: 'api' as const, timestamp: 200 },
        { lang: 'en', text: 'cherry', translation: 'red fruit', source: 'cache' as const, timestamp: 300 },
      ],
    };

    const result = mergeSnapshots(local, remote);
    expect(result.mergedSnapshot.wordLookups).toHaveLength(3);
    const apple = result.mergedSnapshot.wordLookups?.find((w) => w.text === 'apple');
    expect(apple?.translation).toBe('delicious fruit');
  });

  it('merges audio metadata without duplicating records', () => {
    const audio1 = {
      id: 'aud-1',
      articleId: 'art-1',
      mimeType: 'audio/mpeg',
      fileName: 'test.mp3',
      fileSize: 1000,
      duration: 10,
      sourceType: 'tts' as const,
      createdAt: 100,
    };
    const audio2 = { ...audio1, id: 'aud-2' };

    const local = { ...emptySnapshot, audioMetas: [audio1] };
    const remote = { ...emptySnapshot, audioMetas: [audio1, audio2] };

    const result = mergeSnapshots(local, remote);
    expect(result.mergedSnapshot.audioMetas).toHaveLength(2);
  });

  it('keeps local article when local is newer or equal', () => {
    const local: SyncSnapshot = {
      ...emptySnapshot,
      exportedAt: 3000,
      articles: [{ ...baseArticle, title: 'Local Newer', updatedAt: 3000 }],
    };
    const remote: SyncSnapshot = {
      ...emptySnapshot,
      exportedAt: 2000,
      articles: [{ ...baseArticle, title: 'Remote Older', updatedAt: 2000 }],
    };
    const result = mergeSnapshots(local, remote);
    expect(result.mergedSnapshot.articles[0].title).toBe('Local Newer');
    expect(result.stats.articlesUpdated).toBe(0);
    expect(result.mergedSnapshot.exportedAt).toBe(3000);
  });

  it('keeps local settings when local settings are newer than remote', () => {
    const localSetting: SettingsRecord = {
      key: 'k1',
      value: {
        theme: 'light',
        translation: { enabled: true, baseUrl: '', apiKey: '', model: '' },
        tts: { provider: 'openai', baseUrl: '', apiKey: '', modelOrVoiceId: '' },
        printOptions: { defaultTallyBoxes: 60 },
        dictionary: { hotkey: 'Alt', cacheTtlDays: 2 },
      },
      updatedAt: 5000,
    };
    const remoteSetting: SettingsRecord = {
      key: 'k1',
      value: {
        theme: 'dark',
        translation: { enabled: true, baseUrl: '', apiKey: '', model: '' },
        tts: { provider: 'openai', baseUrl: '', apiKey: '', modelOrVoiceId: '' },
        printOptions: { defaultTallyBoxes: 60 },
        dictionary: { hotkey: 'Alt', cacheTtlDays: 2 },
      },
      updatedAt: 4000,
    };
    const local: SyncSnapshot = { ...emptySnapshot, settings: [localSetting] };
    const remote: SyncSnapshot = { ...emptySnapshot, settings: [remoteSetting] };

    const result = mergeSnapshots(local, remote);
    expect(result.mergedSnapshot.settings[0].value.theme).toBe('light');
    expect(result.stats.settingsUpdated).toBe(0);
  });

  it('handles undefined wordLookups, audioMetas, and lastPracticedAt gracefully', () => {
    const localArt: ArticleRecord = { ...baseArticle, lastPracticedAt: undefined };
    const remoteArt: ArticleRecord = { ...baseArticle, lastPracticedAt: undefined };
    const local: SyncSnapshot = {
      schemaVersion: 1,
      exportedAt: 100,
      articles: [localArt],
      drillLogs: [],
      settings: [],
      wordLookups: undefined,
      audioMetas: undefined,
    };
    const remote: SyncSnapshot = {
      schemaVersion: 1,
      exportedAt: 200,
      articles: [remoteArt],
      drillLogs: [],
      settings: [],
      wordLookups: undefined,
      audioMetas: undefined,
    };

    const result = mergeSnapshots(local, remote);
    expect(result.mergedSnapshot.articles[0].lastPracticedAt).toBeUndefined();
    expect(result.mergedSnapshot.wordLookups).toEqual([]);
    expect(result.mergedSnapshot.audioMetas).toEqual([]);
    expect(result.mergedSnapshot.exportedAt).toBe(200);
  });
});
