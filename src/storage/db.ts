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
}

export const db = new TalkDrillDatabase();
