import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../../../src/storage/db';
import { DrillCounterService } from '../../../src/services/drillCounterService';
import { playMechanicalClick } from '../../../src/utils/audioClickSynth';

vi.mock('../../../src/utils/audioClickSynth', () => ({
  playMechanicalClick: vi.fn(),
}));

describe('DrillCounterService (TDD)', () => {
  let service: DrillCounterService;
  const articleId = 'art-drill-1';

  beforeEach(async () => {
    vi.clearAllMocks();
    await db.articles.clear();
    await db.drillLogs.clear();

    await db.articles.add({
      id: articleId,
      title: 'Drill Test',
      sourceText: 'Hello',
      targetText: 'Hola',
      sourceLang: 'en',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
      targetCount: 500,
      currentCount: 0,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      isArchived: 0,
    });

    service = new DrillCounterService();
  });

  it('increments counter synchronously in memory and persists asynchronously', async () => {
    await service.loadArticle(articleId);
    expect(service.getCount(articleId)).toBe(0);

    const count1 = service.increment(articleId);
    expect(count1).toBe(1);
    expect(playMechanicalClick).toHaveBeenCalledTimes(1);

    const count2 = service.increment(articleId);
    expect(count2).toBe(2);
    expect(playMechanicalClick).toHaveBeenCalledTimes(2);

    await service.flushPendingSaves();

    const saved = await db.articles.get(articleId);
    expect(saved?.currentCount).toBe(2);

    const logs = await db.drillLogs.where('articleId').equals(articleId).toArray();
    expect(logs.length).toBe(2);
    expect(logs[0]?.delta).toBe(1);
    expect(logs[0]?.resultingCount).toBe(1);
    expect(logs[1]?.delta).toBe(1);
    expect(logs[1]?.resultingCount).toBe(2);
  });

  it('can disable mechanical click feedback', () => {
    service.setMechanicalClick(false);
    const count = service.increment(articleId);
    expect(count).toBe(1);
    expect(playMechanicalClick).not.toHaveBeenCalled();
  });

  it('undoes counter by 1, clamped at 0', async () => {
    await service.loadArticle(articleId);
    service.increment(articleId);
    expect(service.getCount(articleId)).toBe(1);

    const countAfterUndo = service.undo(articleId);
    expect(countAfterUndo).toBe(0);

    // Another undo should not go negative
    const countAfterSecondUndo = service.undo(articleId);
    expect(countAfterSecondUndo).toBe(0);

    await service.flushPendingSaves();
    const saved = await db.articles.get(articleId);
    expect(saved?.currentCount).toBe(0);

    const logs = await db.drillLogs.where('articleId').equals(articleId).toArray();
    expect(logs.length).toBe(2);
    expect(logs[1]?.delta).toBe(-1);
    expect(logs[1]?.resultingCount).toBe(0);
  });

  it('loads non-existent article with default count 0', async () => {
    const loadedCount = await service.loadArticle('non-existent-id');
    expect(loadedCount).toBe(0);
    expect(service.getCount('non-existent-id')).toBe(0);
  });

  it('clears active timers and flushes all pending changes', async () => {
    await service.loadArticle(articleId);
    service.increment(articleId);
    service.increment(articleId);
    await service.flushPendingSaves();

    const saved = await db.articles.get(articleId);
    expect(saved?.currentCount).toBe(2);
  });

  it('manually sets exact count within [0, 99999] and handles boundary values', async () => {
    await service.loadArticle(articleId);
    service.increment(articleId); // count = 1
    service.increment(articleId); // count = 2

    const newCount = service.manualSet(articleId, 342);
    expect(newCount).toBe(342);

    // Test upper boundary 99999
    const maxCount = service.manualSet(articleId, 99999);
    expect(maxCount).toBe(99999);

    // Test lower boundary 0 with non-zero prev (kills exactCount + prev mutant)
    const zeroCount = service.manualSet(articleId, 0);
    expect(zeroCount).toBe(0);

    await service.flushPendingSaves();
    const saved = await db.articles.get(articleId);
    expect(saved?.currentCount).toBe(0);

    const logs = await db.drillLogs.where('articleId').equals(articleId).toArray();
    // logs: inc(1), inc(1), manualSet(342 - 2 = 340), manualSet(99999 - 342 = 99657), manualSet(0 - 99999 = -99999)
    expect(logs.length).toBe(5);
    expect(logs[2]?.delta).toBe(340);
    expect(logs[3]?.delta).toBe(99657);
    expect(logs[4]?.delta).toBe(-99999);
  });

  it('throws error when setting negative or invalid manual count', async () => {
    await service.loadArticle(articleId);
    expect(() => service.manualSet(articleId, -1)).toThrow('Invalid count');
    expect(() => service.manualSet(articleId, 100000)).toThrow('Invalid count');
    expect(() => service.manualSet(articleId, 3.14)).toThrow('Invalid count');
  });

  it('handles flush when no pending changes exist', async () => {
    await service.flushPendingSaves();
    expect(service.getCount(articleId)).toBe(0);
  });

  it('notifies milestone callbacks when crossed and allows unsubscribing', async () => {
    await service.loadArticle(articleId);
    service.manualSet(articleId, 49);

    const milestoneSpy = vi.fn();
    const unsubscribe = service.onMilestone(milestoneSpy);

    service.increment(articleId);
    expect(milestoneSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        hasReached: true,
        milestone: 50,
        title: 'Phoneme Familiarity',
      })
    );

    milestoneSpy.mockClear();
    unsubscribe();
    service.manualSet(articleId, 149);
    service.increment(articleId);
    expect(milestoneSpy).not.toHaveBeenCalled();
  });

  it('delegates calculateZhengStrokes properly', () => {
    const res = service.calculateZhengStrokes(12);
    expect(res.fullZhengCount).toBe(2);
    expect(res.partialStrokes).toBe(2);
    expect(res.totalCount).toBe(12);
  });
});
