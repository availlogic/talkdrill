import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DrillWorkspace } from '../../../src/views/DrillWorkspace';
import { db } from '../../../src/storage/db';
import { corpusService } from '../../../src/services/corpusService';
import { playerEngine } from '../../../src/services/playerEngine';

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

  it('renders targetText and sourceText in interleaved bilingual paragraphs with whitespace-pre-wrap', async () => {
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

    const targetEl1 = await screen.findByText('¡Perdona!');
    expect(targetEl1.className).toContain('whitespace-pre-wrap');
    expect(targetEl1.className).toContain('break-words');

    const sourceEl1 = screen.getByText('Excuse me!');
    expect(sourceEl1.className).toContain('whitespace-pre-wrap');
    expect(sourceEl1.className).toContain('break-words');

    const targetEl2 = screen.getByText('¿Sí?');
    const sourceEl2 = screen.getByText('Yes?');
    expect(targetEl2).toBeDefined();
    expect(sourceEl2).toBeDefined();

    const targetEl3 = screen.getByText('¿Es tu bolso este?');
    const sourceEl3 = screen.getByText('Is this your handbag?');
    expect(targetEl3).toBeDefined();
    expect(sourceEl3).toBeDefined();
  });

  it('hides sourceText completely and displays targetText when Zen mode is activated on bilingual drill', async () => {
    const multilineArt = await corpusService.createArticle({
      title: 'Dialogue Drill 2',
      sourceText: 'Excuse me!\n\nYes?',
      targetText: '¡Perdona!\n\n¿Sí?',
      sourceLang: 'en-US',
      targetLang: 'es-ES',
      mode: 'translate_needed',
      targetCount: 500,
    });

    render(<DrillWorkspace articleId={multilineArt.id} onBack={vi.fn()} />);
    await screen.findByText('¡Perdona!');
    expect(screen.getByText('Excuse me!')).toBeDefined();

    // Toggle Focus Mode (Zen Mode)
    fireEvent.click(screen.getByRole('button', { name: /focus mode/i }));

    // Source text should now be hidden
    expect(screen.queryByText('Excuse me!')).toBeNull();
    expect(screen.queryByText('Yes?')).toBeNull();
    // Target text should be displayed
    const targetEl = screen.getByText(/¡Perdona!/);
    expect(targetEl.textContent).toContain('¡Perdona!\n\n¿Sí?');
  });

  it('displays only targetText without sourceText for direct_foreign articles with empty source', async () => {
    const directArt = await corpusService.createArticle({
      title: 'Direct Foreign Drill',
      sourceText: '',
      targetText: 'Solo en español',
      sourceLang: 'es-ES',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
      targetCount: 300,
    });

    render(<DrillWorkspace articleId={directArt.id} onBack={vi.fn()} />);
    expect(await screen.findByText('Solo en español')).toBeDefined();
    expect(screen.queryByText('### Source Reference')).toBeNull();
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

  it('triggers replay with KeyP shortcut and ignores browser shortcuts with modifiers', async () => {
    const backSpy = vi.fn();
    render(<DrillWorkspace articleId={articleId} onBack={backSpy} />);

    await screen.findByText('¿Nos cobras, por favor?');

    const playSpy = vi.spyOn(playerEngine, 'play');

    // Press KeyR with metaKey & shiftKey (browser hard refresh Cmd+Shift+R) - must NOT trigger replay
    fireEvent.keyDown(window, { code: 'KeyR', metaKey: true, shiftKey: true });
    expect(playSpy).not.toHaveBeenCalled();

    // Press KeyP with metaKey (browser print Cmd+P) - must NOT trigger replay
    fireEvent.keyDown(window, { code: 'KeyP', metaKey: true });
    expect(playSpy).not.toHaveBeenCalled();

    // Press KeyP alone - triggers replay
    fireEvent.keyDown(window, { code: 'KeyP' });
    expect(playSpy).toHaveBeenCalled();
    playSpy.mockRestore();

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

  it('renders audio player bar and handles player controls and A-B loop cancellation when audio exists', async () => {
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

    // Set loop start A
    fireEvent.click(screen.getByRole('button', { name: 'Set loop start A' }));

    // Should immediately display A reference info and Clear loop button
    expect(await screen.findByText(/A: \[/i)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Clear loop' })).toBeDefined();

    // Reproduce bug: Drag slider or seek forward to find point B
    fireEvent.change(slider, { target: { value: '15' } });

    // A reference and Clear loop button MUST persist while dragging or playing audio!
    expect(screen.getByText(/A: \[/i)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Clear loop' })).toBeDefined();

    // Verify seeking with jump buttons also preserves A reference
    fireEvent.click(screen.getByRole('button', { name: 'Forward 2s' }));
    expect(screen.getByText(/A: \[/i)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Clear loop' })).toBeDefined();

    // User can still cancel A after dragging slider or jumping
    const clearLoopBtn = screen.getByRole('button', { name: 'Clear loop' });
    fireEvent.click(clearLoopBtn);
    expect(screen.queryByText(/A: \[/i)).toBeNull();

    // Now set A and B
    fireEvent.click(screen.getByRole('button', { name: 'Set loop start A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set loop end B' }));
    expect(await screen.findByText(/A-B Loop/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
  });

  it('places AudioPlayerBar between text display and Tally Progress Board in non-focus mode, and at bottom in focus mode', async () => {
    await db.audios.add({
      id: 'audio-art-position-test',
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

    const targetTextEl = await screen.findByText('¿Nos cobras, por favor?');
    const audioSlider = await screen.findByRole('slider', { name: /audio progress bar/i });
    const tallyBoardLabel = screen.getByText('Tally Progress Board');
    const drillCapsuleBtn = screen.getByRole('button', { name: /drill \+1/i });

    // In non-focus mode:
    // 1. target text is before audioSlider
    expect(targetTextEl.compareDocumentPosition(audioSlider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // 2. audioSlider is before tallyBoardLabel
    expect(audioSlider.compareDocumentPosition(tallyBoardLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // 3. tallyBoardLabel is before drillCapsuleBtn
    expect(tallyBoardLabel.compareDocumentPosition(drillCapsuleBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Toggle Focus Mode
    const focusBtn = screen.getByRole('button', { name: /focus mode/i });
    fireEvent.click(focusBtn);

    // In focus mode:
    // Tally Progress Board should NOT be visible
    expect(screen.queryByText('Tally Progress Board')).toBeNull();

    // Audio player should still be visible and placed before the BigDrillCapsule at the bottom
    const focusAudioSlider = screen.getByRole('slider', { name: /audio progress bar/i });
    expect(focusAudioSlider.compareDocumentPosition(drillCapsuleBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
