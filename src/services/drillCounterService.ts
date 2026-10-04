import { db } from '../storage/db';
import { type ZhengStrokeState, type MilestoneResult } from '../types/models';
import { calculateZhengStrokes, checkMilestone } from '../utils/zhengMath';

export class DrillCounterService {
  private memoryCounts = new Map<string, number>();
  private saveTimers = new Map<string, NodeJS.Timeout>();
  private pendingLogs = new Map<string, Array<{ delta: number; count: number; timestamp: number }>>();
  private milestoneListeners = new Set<(res: MilestoneResult) => void>();

  async loadArticle(articleId: string): Promise<number> {
    const article = await db.articles.get(articleId);
    const count = article?.currentCount ?? 0;
    this.memoryCounts.set(articleId, count);
    return count;
  }

  getCount(articleId: string): number {
    return this.memoryCounts.get(articleId) ?? 0;
  }

  increment(articleId: string): number {
    const prev = this.getCount(articleId);
    const next = prev + 1;
    this.memoryCounts.set(articleId, next);

    this.checkAndNotifyMilestone(prev, next);
    this.recordDelta(articleId, 1, next);
    return next;
  }

  undo(articleId: string): number {
    const prev = this.getCount(articleId);
    if (prev <= 0) {
      return 0;
    }
    const next = prev - 1;
    this.memoryCounts.set(articleId, next);
    this.recordDelta(articleId, -1, next);
    return next;
  }

  manualSet(articleId: string, exactCount: number): number {
    if (!Number.isInteger(exactCount) || exactCount < 0 || exactCount > 99999) {
      throw new Error(`Invalid count: ${exactCount}. Must be integer between 0 and 99999.`);
    }

    const prev = this.getCount(articleId);
    this.memoryCounts.set(articleId, exactCount);
    this.checkAndNotifyMilestone(prev, exactCount);
    this.recordDelta(articleId, exactCount - prev, exactCount);
    return exactCount;
  }

  calculateZhengStrokes(count: number): ZhengStrokeState {
    return calculateZhengStrokes(count);
  }

  onMilestone(listener: (res: MilestoneResult) => void): () => void {
    this.milestoneListeners.add(listener);
    return () => this.milestoneListeners.delete(listener);
  }

  private checkAndNotifyMilestone(prev: number, curr: number): void {
    const result = checkMilestone(prev, curr);
    if (result.hasReached) {
      this.milestoneListeners.forEach((fn) => fn(result));
    }
  }

  private recordDelta(articleId: string, delta: number, resultingCount: number): void {
    const queue = this.pendingLogs.get(articleId) ?? [];
    queue.push({ delta, count: resultingCount, timestamp: Date.now() });
    this.pendingLogs.set(articleId, queue);

    const existingTimer = this.saveTimers.get(articleId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.flushArticle(articleId).catch(() => {});
    }, 150);

    this.saveTimers.set(articleId, timer);
  }

  private async flushArticle(articleId: string): Promise<void> {
    const count = this.memoryCounts.get(articleId);
    const logs = this.pendingLogs.get(articleId) ?? [];
    this.pendingLogs.delete(articleId);
    this.saveTimers.delete(articleId);

    if (count !== undefined) {
      const now = Date.now();
      await db.articles.update(articleId, {
        currentCount: count,
        lastPracticedAt: now,
        updatedAt: now,
      });
    }

    if (logs.length > 0) {
      const records = logs.map((l) => ({
        articleId,
        delta: l.delta,
        resultingCount: l.count,
        timestamp: l.timestamp,
      }));
      await db.drillLogs.bulkAdd(records);
    }
  }

  async flushPendingSaves(): Promise<void> {
    const articleIds = Array.from(this.saveTimers.keys());
    for (const id of articleIds) {
      const timer = this.saveTimers.get(id);
      if (timer) clearTimeout(timer);
      await this.flushArticle(id);
    }
  }
}

export const drillCounterService = new DrillCounterService();
