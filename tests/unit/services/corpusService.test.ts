import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../src/storage/db';
import { corpusService } from '../../../src/services/corpusService';

describe('CorpusService (TDD)', () => {
  beforeEach(async () => {
    await db.articles.clear();
    await db.audios.clear();
    await db.drillLogs.clear();
  });

  it('creates an article with default target count and persists to db', async () => {
    const article = await corpusService.createArticle({
      title: 'Restaurante en Madrid',
      sourceText: 'Could we have the bill, please?',
      targetText: '¿Nos cobras, por favor?',
      sourceLang: 'en',
      targetLang: 'es-ES',
      mode: 'translate_needed',
    });

    expect(article.id).toBeDefined();
    expect(article.targetCount).toBe(500);
    expect(article.currentCount).toBe(0);
    expect(article.isArchived).toBe(false);

    const saved = await db.articles.get(article.id);
    expect(saved?.title).toBe('Restaurante en Madrid');
    expect(saved?.isArchived).toBe(0);
  });

  it('uses default title Untitled Drill when title is blank', async () => {
    const article = await corpusService.createArticle({
      title: '   ',
      sourceText: 'Hello',
      targetText: 'Hola',
      sourceLang: 'en',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
    });
    expect(article.title).toBe('Untitled Drill');
  });

  it('returns null when getting non-existent article', async () => {
    const res = await corpusService.getArticle('non-existent-id');
    expect(res).toBeNull();
  });

  it('lists active articles and optionally archived articles', async () => {
    const art1 = await corpusService.createArticle({
      title: 'Active Article',
      sourceText: 'One',
      targetText: 'Uno',
      sourceLang: 'en',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
    });

    const art2 = await corpusService.createArticle({
      title: 'To Archive',
      sourceText: 'Two',
      targetText: 'Dos',
      sourceLang: 'en',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
    });

    await corpusService.updateArticle(art2.id, { isArchived: true });

    const activeList = await corpusService.listArticles(false);
    expect(activeList.length).toBe(1);
    expect(activeList[0]?.id).toBe(art1.id);

    const allList = await corpusService.listArticles(true);
    expect(allList.length).toBe(2);

    const archivedOnlyList = await corpusService.listArticles(false, true);
    expect(archivedOnlyList.length).toBe(1);
    expect(archivedOnlyList[0]?.id).toBe(art2.id);
  });

  it('updates article fields properly and throws for missing article', async () => {
    const art = await corpusService.createArticle({
      title: 'Original Title',
      sourceText: 'Hello',
      targetText: 'Hola',
      sourceLang: 'en',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
    });

    const updated = await corpusService.updateArticle(art.id, {
      title: 'New Title',
      sourceText: 'Hello world',
      targetText: '¡Hola mundo!',
      sourceLang: 'en-US',
      targetLang: 'es-ES',
      mode: 'translate_needed',
      targetCount: 300,
      isArchived: false,
    });

    expect(updated.title).toBe('New Title');
    expect(updated.sourceText).toBe('Hello world');
    expect(updated.targetText).toBe('¡Hola mundo!');
    expect(updated.sourceLang).toBe('en-US');
    expect(updated.mode).toBe('translate_needed');
    expect(updated.targetCount).toBe(300);
    expect(updated.isArchived).toBe(false);

    await expect(corpusService.updateArticle('fake-id', { title: 'X' })).rejects.toThrow(
      'Article not found'
    );
  });

  it('deletes an article via cascade deletion', async () => {
    const art = await corpusService.createArticle({
      title: 'To Delete',
      sourceText: 'Bye',
      targetText: 'Adiós',
      sourceLang: 'en',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
    });

    await corpusService.deleteArticle(art.id);
    const retrieved = await corpusService.getArticle(art.id);
    expect(retrieved).toBeNull();
  });

  it('creates an article with explicit custom targetCount', async () => {
    const article = await corpusService.createArticle({
      title: 'Custom Target',
      sourceText: 'Hi',
      targetText: 'Hola',
      sourceLang: 'en',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
      targetCount: 300,
    });
    expect(article.targetCount).toBe(300);
  });

  it('sorts articles by lastPracticedAt descending when present', async () => {
    const art1 = await corpusService.createArticle({
      title: 'First Created',
      sourceText: 'One',
      targetText: 'Uno',
      sourceLang: 'en',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
    });

    const art2 = await corpusService.createArticle({
      title: 'Second Created',
      sourceText: 'Two',
      targetText: 'Dos',
      sourceLang: 'en',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
    });

    // Practice art1 at a much later timestamp
    await db.articles.update(art1.id, { lastPracticedAt: Date.now() + 100000 });

    const sorted = await corpusService.listArticles();
    expect(sorted[0]?.id).toBe(art1.id);
    expect(sorted[1]?.id).toBe(art2.id);
  });

  it('updates individual fields in updateArticle', async () => {
    const art = await corpusService.createArticle({
      title: 'Test',
      sourceText: 'Hello',
      targetText: 'Hola',
      sourceLang: 'en',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
    });

    // Update title only
    const u1 = await corpusService.updateArticle(art.id, { title: 'Updated' });
    expect(u1.title).toBe('Updated');

    // Update isArchived to true
    const u2 = await corpusService.updateArticle(art.id, { isArchived: true });
    expect(u2.isArchived).toBe(true);

    // Update isArchived back to false
    const u3 = await corpusService.updateArticle(art.id, { isArchived: false });
    expect(u3.isArchived).toBe(false);
  });

  it('parses text file at exact 2MB boundary and rejects boundary + 1', async () => {
    const exact2MBContent = 'b'.repeat(2 * 1024 * 1024);
    const validFile = new File([exact2MBContent], 'exact2mb.txt', { type: 'text/plain' });
    const content = await corpusService.parseTextFile(validFile);
    expect(content.length).toBe(2 * 1024 * 1024);

    const exceedFile = new File(['c'.repeat(2 * 1024 * 1024 + 1)], 'exceed.txt', { type: 'text/plain' });
    await expect(corpusService.parseTextFile(exceedFile)).rejects.toThrow(
      'Text file size exceeds 2MB limit'
    );
  });
});
