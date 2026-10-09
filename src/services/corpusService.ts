import { db, type ArticleRecord } from '../storage/db';
import { syncManager } from './syncManager';
import { type Article, type LanguageMode } from '../types/models';

export interface CreateArticleInput {
  title: string;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  mode: LanguageMode;
  targetCount?: number;
}

export interface UpdateArticleInput {
  title?: string;
  sourceText?: string;
  targetText?: string;
  sourceLang?: string;
  targetLang?: string;
  mode?: LanguageMode;
  targetCount?: number;
  isArchived?: boolean;
}

export interface ICorpusService {
  createArticle(input: CreateArticleInput): Promise<Article>;
  getArticle(id: string): Promise<Article | null>;
  listArticles(includeArchived?: boolean, archivedOnly?: boolean): Promise<Article[]>;
  updateArticle(id: string, input: UpdateArticleInput): Promise<Article>;
  deleteArticle(id: string): Promise<void>;
  parseTextFile(file: File): Promise<string>;
}

function mapRecordToArticle(record: ArticleRecord): Article {
  return {
    id: record.id,
    title: record.title,
    sourceText: record.sourceText,
    targetText: record.targetText,
    sourceLang: record.sourceLang,
    targetLang: record.targetLang,
    mode: record.mode,
    targetCount: record.targetCount,
    currentCount: record.currentCount,
    audioId: record.audioId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastPracticedAt: record.lastPracticedAt,
    isArchived: record.isArchived === 1,
  };
}

const MAX_TEXT_FILE_BYTES = 2 * 1024 * 1024; // 2MB

export class CorpusService implements ICorpusService {
  async createArticle(input: CreateArticleInput): Promise<Article> {
    const now = Date.now();
    const id = crypto.randomUUID();
    const record: ArticleRecord = {
      id,
      title: input.title.trim() || 'Untitled Drill',
      sourceText: input.sourceText,
      targetText: input.targetText,
      sourceLang: input.sourceLang,
      targetLang: input.targetLang,
      mode: input.mode,
      targetCount: input.targetCount ?? 500,
      currentCount: 0,
      createdAt: now,
      updatedAt: now,
      isArchived: 0,
    };

    await db.articles.add(record);
    syncManager.scheduleSync();
    return mapRecordToArticle(record);
  }

  async getArticle(id: string): Promise<Article | null> {
    const record = await db.articles.get(id);
    return record ? mapRecordToArticle(record) : null;
  }

  async listArticles(includeArchived = false, archivedOnly = false): Promise<Article[]> {
    let collection;
    if (archivedOnly) {
      collection = db.articles.where('isArchived').equals(1);
    } else if (includeArchived) {
      collection = db.articles.toCollection();
    } else {
      collection = db.articles.where('isArchived').equals(0);
    }

    const records = await collection.toArray();
    records.sort((a, b) => {
      const timeA = a.lastPracticedAt ?? a.createdAt;
      const timeB = b.lastPracticedAt ?? b.createdAt;
      return timeB - timeA;
    });

    return records.map(mapRecordToArticle);
  }

  async updateArticle(id: string, input: UpdateArticleInput): Promise<Article> {
    const existing = await db.articles.get(id);
    if (!existing) {
      throw new Error(`Article not found: ${id}`);
    }

    const updates: Partial<ArticleRecord> = {
      updatedAt: Date.now(),
    };

    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.sourceText !== undefined) updates.sourceText = input.sourceText;
    if (input.targetText !== undefined) updates.targetText = input.targetText;
    if (input.sourceLang !== undefined) updates.sourceLang = input.sourceLang;
    if (input.targetLang !== undefined) updates.targetLang = input.targetLang;
    if (input.mode !== undefined) updates.mode = input.mode;
    if (input.targetCount !== undefined) updates.targetCount = input.targetCount;
    if (input.isArchived !== undefined) updates.isArchived = input.isArchived ? 1 : 0;

    await db.articles.update(id, updates);
    syncManager.scheduleSync();
    const updated = await db.articles.get(id);
    return mapRecordToArticle(updated!);
  }

  async deleteArticle(id: string): Promise<void> {
    await db.deleteArticleCascade(id);
    syncManager.scheduleSync();
  }

  async parseTextFile(file: File): Promise<string> {
    if (file.size > MAX_TEXT_FILE_BYTES) {
      throw new Error('Text file size exceeds 2MB limit');
    }
    return await file.text();
  }
}

export const corpusService = new CorpusService();
