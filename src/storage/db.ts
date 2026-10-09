import Dexie, { type EntityTable } from 'dexie';
import {
  type LanguageMode,
  type AppSettings,
  type WordLookupRecord,
} from '../types/models';

export interface ArticleRecord {
  id: string;
  title: string;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  mode: LanguageMode;
  targetCount: number;
  currentCount: number;
  audioId?: string | undefined;
  createdAt: number;
  updatedAt: number;
  lastPracticedAt?: number | undefined;
  isArchived: number; // 0: active, 1: archived (indexed)
}

export interface AudioRecord {
  id: string;
  articleId: string;
  blob: Blob;
  mimeType: string;
  fileName: string;
  fileSize: number;
  duration: number;
  sourceType: 'tts' | 'upload';
  createdAt: number;
}

export interface DrillLogRecord {
  id?: number;
  articleId: string;
  delta: number;
  resultingCount: number;
  timestamp: number;
}

export interface SettingsRecord {
  key: string;
  value: AppSettings;
  updatedAt: number;
}

export class TalkDrillDatabase extends Dexie {
  articles!: EntityTable<ArticleRecord, 'id'>;
  audios!: EntityTable<AudioRecord, 'id'>;
  drillLogs!: EntityTable<DrillLogRecord, 'id'>;
  settings!: EntityTable<SettingsRecord, 'key'>;
  wordLookups!: EntityTable<WordLookupRecord, 'id'>;

  constructor() {
    super('TalkDrillDB');

    this.version(1).stores({
      articles: 'id, targetLang, mode, isArchived, lastPracticedAt, createdAt',
      audios: 'id, articleId',
      drillLogs: '++id, articleId, timestamp',
      settings: 'key',
      wordLookups: '++id, [lang+text], timestamp',
    });
  }

  async deleteArticleCascade(articleId: string): Promise<void> {
    await this.transaction('rw', [this.articles, this.audios, this.drillLogs], async () => {
      await this.articles.delete(articleId);
      await this.audios.where('articleId').equals(articleId).delete();
      await this.drillLogs.where('articleId').equals(articleId).delete();
    });
  }

  async exportSnapshot(): Promise<import('../services/syncMerger').SyncSnapshot> {
    const [articles, logs, settings, lookups, audios] = await Promise.all([
      this.articles.toArray(),
      this.drillLogs.toArray(),
      this.settings.toArray(),
      this.wordLookups.toArray(),
      this.audios.toArray(),
    ]);

    const audioMetas = audios.map((a) => ({
      id: a.id,
      articleId: a.articleId,
      mimeType: a.mimeType,
      fileName: a.fileName,
      fileSize: a.fileSize,
      duration: a.duration,
      sourceType: a.sourceType,
      createdAt: a.createdAt,
    }));

    return {
      schemaVersion: 1,
      exportedAt: Date.now(),
      articles,
      drillLogs: logs.map(({ id: _id, ...rest }) => rest),
      settings,
      wordLookups: lookups.map(({ id: _id, ...rest }) => rest),
      audioMetas,
    };
  }

  async clearAllData(): Promise<void> {
    const tables = [this.articles, this.audios, this.drillLogs, this.settings, this.wordLookups];
    await this.transaction('rw', tables, async () => {
      await Promise.all([
        this.articles.clear(),
        this.audios.clear(),
        this.drillLogs.clear(),
        this.settings.clear(),
        this.wordLookups.clear(),
      ]);
    });
  }

  async applyMergedSnapshot(snapshot: import('../services/syncMerger').SyncSnapshot): Promise<void> {
    const tables = [this.articles, this.drillLogs, this.settings, this.wordLookups];
    await this.transaction('rw', tables, async () => {
      if (snapshot.articles?.length) await this.articles.bulkPut(snapshot.articles);
      if (snapshot.settings?.length) await this.settings.bulkPut(snapshot.settings);
      if (snapshot.wordLookups?.length) {
        await this.wordLookups.bulkPut(snapshot.wordLookups as WordLookupRecord[]);
      }
      if (snapshot.drillLogs?.length) {
        await this.drillLogs.clear();
        await this.drillLogs.bulkAdd(snapshot.drillLogs as DrillLogRecord[]);
      }
    });
  }
}

export const db = new TalkDrillDatabase();
