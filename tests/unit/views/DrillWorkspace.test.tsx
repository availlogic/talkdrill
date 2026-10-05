import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DrillWorkspace } from '../../../src/views/DrillWorkspace';
import { db } from '../../../src/storage/db';
import { corpusService } from '../../../src/services/corpusService';

describe('DrillWorkspace View (TDD)', () => {
  let articleId: string;

  beforeEach(async () => {
    await db.articles.clear();
    await db.audios.clear();
    await db.drillLogs.clear();

    const art = await corpusService.createArticle({
      title: 'Restaurante Elena',
      sourceText: 'Hello',
      targetText: '¿Nos cobras, por favor?',
      sourceLang: 'en',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
      targetCount: 500,
    });
    articleId = art.id;
  });

  it('renders target text and BigDrillCapsule with initial count', async () => {
    render(<DrillWorkspace articleId={articleId} onBack={vi.fn()} />);

    expect(await screen.findByText('¿Nos cobras, por favor?')).toBeDefined();
    const langBadge = screen.getByText('es-ES');
    expect(langBadge.className).not.toContain('uppercase');
    expect(screen.getByRole('button', { name: /drill \+1/i })).toBeDefined();
  });

  it('renders targetText and sourceText preserving multiline whitespace and breaks with whitespace-pre-wrap', async () => {
    const multilineArt = await corpusService.createArticle({
      title: 'Dialogue Drill',
      sourceText: 'Excuse me!\n\nYes?\n\nIs this your handbag?',
      targetText: '¡Perdona!\n\n¿Sí?\n\n¿Es tu bolso este?',
      sourceLang: 'en-US',
      targetLang: 'es-ES',
      mode: 'translate_needed',
      targetCount: 500,
    });

    render(<DrillWorkspace articleId={multilineArt.id} onBack={vi.fn()} />);

    const targetEl = await screen.findByText(/¡Perdona!/);
    expect(targetEl.className).toContain('whitespace-pre-wrap');
    expect(targetEl.className).toContain('break-words');
    expect(targetEl.textContent).toContain('¡Perdona!\n\n¿Sí?\n\n¿Es tu bolso este?');

    const sourceEl = screen.getByText(/Excuse me!/);
    expect(sourceEl.className).toContain('whitespace-pre-wrap');
    expect(sourceEl.className).toContain('break-words');
    expect(sourceEl.textContent).toContain('Excuse me!\n\nYes?\n\nIs this your handbag?');
  });

  it('increments count on primary capsule button click', async () => {
    render(<DrillWorkspace articleId={articleId} onBack={vi.fn()} />);

    const incBtn = await screen.findByRole('button', { name: /drill \+1/i });
    fireEvent.click(incBtn);

    expect(screen.getByText('1')).toBeDefined();
  });

  it('handles keyboard shortcut Space (+1) and Z (-1)', async () => {
    render(<DrillWorkspace articleId={articleId} onBack={vi.fn()} />);

    await screen.findByText('¿Nos cobras, por favor?');

    // Press Space
    fireEvent.keyDown(window, { code: 'Space' });
    expect(screen.getByText('1')).toBeDefined();

    // Press Space again
    fireEvent.keyDown(window, { code: 'Space' });
    expect(screen.getByText('2')).toBeDefined();

    // Press Z
    fireEvent.keyDown(window, { code: 'KeyZ' });
    expect(screen.getByText('1')).toBeDefined();
  });

  it('opens numeric override modal when clicking count override button', async () => {
    render(<DrillWorkspace articleId={articleId} onBack={vi.fn()} />);

    const countBtn = await screen.findByRole('button', { name: /adjust repetition count/i });
    fireEvent.click(countBtn);

    expect(screen.getByRole('dialog', { name: /adjust repetition count/i })).toBeDefined();
  });

  it('toggles Zen mode on and off', async () => {
    render(<DrillWorkspace articleId={articleId} onBack={vi.fn()} />);

    const zenBtn = await screen.findByRole('button', { name: /focus mode/i });
    fireEvent.click(zenBtn);

    const exitBtn = screen.getByRole('button', { name: /exit focus/i });
    expect(exitBtn).toBeDefined();
    fireEvent.click(exitBtn);
    expect(screen.getByRole('button', { name: /focus mode/i })).toBeDefined();
  });

  it('triggers replay with KeyR shortcut and opens print modal', async () => {
    const backSpy = vi.fn();
    render(<DrillWorkspace articleId={articleId} onBack={backSpy} />);

    await screen.findByText('¿Nos cobras, por favor?');

    // Press KeyR
    fireEvent.keyDown(window, { code: 'KeyR' });

    // Open print modal
    const printBtn = screen.getByRole('button', { name: /print worksheet/i });
    fireEvent.click(printBtn);
    expect(screen.getByRole('dialog', { name: /print worksheet & tally sheet export/i })).toBeDefined();

    // Close print modal
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    // Back button
    const backBtn = screen.getByRole('button', { name: 'Back to Library' });
    fireEvent.click(backBtn);
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('renders audio player bar and handles player controls when audio exists', async () => {
    await db.audios.add({
      id: 'audio-art-1',
      articleId,
      blob: new Blob(['mock-audio'], { type: 'audio/mpeg' }),
      mimeType: 'audio/mpeg',
      fileName: 'mock.mp3',
      fileSize: 100,
      duration: 30,
      sourceType: 'upload',
      createdAt: Date.now(),
    });

    render(<DrillWorkspace articleId={articleId} onBack={vi.fn()} />);

    const playBtn = await screen.findByRole('button', { name: /play/i });
    fireEvent.click(playBtn);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '10' } });

    fireEvent.click(screen.getByRole('button', { name: '1.25x' }));
    fireEvent.click(screen.getByRole('button', { name: 'Forward 2s' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rewind 2s' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set loop start A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set loop end B' }));
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
  });

  it('renders Edit button and triggers onEdit callback', async () => {
    const editSpy = vi.fn();
    render(<DrillWorkspace articleId={articleId} onBack={vi.fn()} onEdit={editSpy} />);

    const editBtn = await screen.findByRole('button', { name: /edit drill/i });
    fireEvent.click(editBtn);

    expect(editSpy).toHaveBeenCalledTimes(1);
  });

  it('toggles archive and restore status from workspace header', async () => {
    render(<DrillWorkspace articleId={articleId} onBack={vi.fn()} />);

    const archiveBtn = await screen.findByRole('button', { name: /archive drill/i });
    fireEvent.click(archiveBtn);

    // After archiving, button changes to restore drill
    const restoreBtn = await screen.findByRole('button', { name: /restore drill/i });
    expect(restoreBtn).toBeDefined();

    // Verify DB updated
    let art = await corpusService.getArticle(articleId);
    expect(art?.isArchived).toBe(true);

    // Click restore to unarchive
    fireEvent.click(restoreBtn);
    const reArchivedBtn = await screen.findByRole('button', { name: /archive drill/i });
    expect(reArchivedBtn).toBeDefined();

    art = await corpusService.getArticle(articleId);
    expect(art?.isArchived).toBe(false);
  });
});
