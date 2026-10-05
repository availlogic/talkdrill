import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DrillWorkspace } from '../../../src/views/DrillWorkspace';
import { db } from '../../../src/storage/db';
import { corpusService } from '../../../src/services/corpusService';
import { playerEngine } from '../../../src/services/playerEngine';
import { DictionaryService } from '../../../src/services/dictionaryService';
import { DEFAULT_SETTINGS } from '../../../src/services/settingsService';

describe('DrillWorkspace View (TDD)', () => {
  let articleId: string;
  const originalSpeechSynthesis = window.speechSynthesis;
  const originalUtterance = window.SpeechSynthesisUtterance;
  let mockSpeak: ReturnType<typeof vi.fn>;
  let mockCancel: ReturnType<typeof vi.fn>;

  const dummyVoices = [
    { voiceURI: 'es-voice-1', name: 'Monica', lang: 'es-ES', default: true },
  ];

  beforeEach(async () => {
    await db.settings.clear();
    await db.articles.clear();
    await db.audios.clear();
    await db.drillLogs.clear();

    mockSpeak = vi.fn();
    mockCancel = vi.fn();

    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak: mockSpeak,
        cancel: mockCancel,
        getVoices: () => dummyVoices,
      },
      writable: true,
      configurable: true,
    });

    class MockUtterance {
      text: string;
      lang = '';
      voice: unknown = null;
      constructor(text: string) {
        this.text = text;
      }
    }

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: MockUtterance,
      writable: true,
      configurable: true,
    });

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

  afterEach(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: originalSpeechSynthesis,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: originalUtterance,
      writable: true,
      configurable: true,
    });
  });

  it('renders target text and BigDrillCapsule with initial count', async () => {
    render(<DrillWorkspace articleId={articleId} onBack={vi.fn()} />);

    const targetEl = await screen.findByText('¿Nos cobras, por favor?');
    expect(targetEl.className).toContain('select-text');
    expect(targetEl.className).toContain('cursor-text');
    expect(targetEl.className).not.toContain('select-none');

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
    expect(targetEl1.className).toContain('select-text');
    expect(targetEl1.className).toContain('cursor-text');
    expect(targetEl1.className).not.toContain('select-none');

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
    expect(targetEl.className).toContain('select-text');
    expect(targetEl.className).toContain('cursor-text');
    expect(targetEl.className).not.toContain('select-none');
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

  it('opens WordLookupPopover on target text selection and closes when drilling', async () => {
    await db.wordLookups.add({
      text: 'cobras',
      lang: 'es-ES',
      ipa: '/ˈko.βɾas/',
      partOfSpeech: 'verb',
      translation: 'charge / collect payment',
      contextNote: 'Informal present',
      timestamp: Date.now(),
    });

    const mockRange = {
      getBoundingClientRect: () => ({ left: 200, bottom: 300 }),
    };
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      isCollapsed: false,
      toString: () => 'cobras',
      getRangeAt: () => mockRange,
    } as unknown as Selection);

    render(<DrillWorkspace articleId={articleId} onBack={vi.fn()} />);

    const targetEl = await screen.findByText('¿Nos cobras, por favor?');
    fireEvent.mouseUp(targetEl);

    // Popover dialog opens and displays cached definition
    expect(await screen.findByRole('dialog')).toBeDefined();
    expect(await screen.findByText('/ˈko.βɾas/')).toBeDefined();
    expect(await screen.findByText('charge / collect payment')).toBeDefined();

    // Now user continues drilling by clicking BigDrillCapsule
    const drillCapsuleBtn = screen.getByRole('button', { name: /drill \+1/i });
    fireEvent.click(drillCapsuleBtn);

    // Popover automatically dismisses
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows pending prompt for uncached word and triggers lookup on hotkey', async () => {
    const lookupSpy = vi.spyOn(DictionaryService.prototype, 'lookupWord').mockResolvedValue({
      text: 'favor',
      lang: 'es-ES',
      ipa: '/faˈβoɾ/',
      translation: 'favor / please',
      source: 'api',
    });

    const mockRange = {
      getBoundingClientRect: () => ({ left: 200, bottom: 300 }),
    };
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      isCollapsed: false,
      toString: () => 'favor',
      getRangeAt: () => mockRange,
    } as unknown as Selection);

    render(<DrillWorkspace articleId={articleId} onBack={vi.fn()} />);

    const targetEl = await screen.findByText('¿Nos cobras, por favor?');
    fireEvent.mouseUp(targetEl);

    // Shows pending prompt with button and hotkey
    expect(await screen.findByRole('dialog')).toBeDefined();
    expect(await screen.findByRole('button', { name: /Look Up with AI/i })).toBeDefined();
    expect(lookupSpy).not.toHaveBeenCalled();

    // Trigger via hotkey
    fireEvent.keyDown(window, { key: 'Alt', code: 'AltLeft' });

    expect(lookupSpy).toHaveBeenCalledWith({
      text: 'favor',
      lang: 'es-ES',
      contextSentence: undefined,
    });
    expect(await screen.findByText('/faˈβoɾ/')).toBeDefined();
  });

  it('speaks word using configured dictionary voiceURI when speaker icon is clicked', async () => {
    await db.settings.put({
      key: 'app_settings',
      value: {
        ...DEFAULT_SETTINGS,
        dictionary: {
          hotkey: 'Alt',
          cacheTtlDays: 2,
          voiceURI: 'es-voice-1',
        },
      },
      updatedAt: Date.now(),
    });

    await db.wordLookups.add({
      text: 'cobras',
      lang: 'es-ES',
      translation: 'charge',
      timestamp: Date.now(),
    });

    const mockRange = {
      getBoundingClientRect: () => ({ left: 200, bottom: 300 }),
    };
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      isCollapsed: false,
      toString: () => 'cobras',
      getRangeAt: () => mockRange,
    } as unknown as Selection);

    render(<DrillWorkspace articleId={articleId} onBack={vi.fn()} />);

    const targetEl = await screen.findByText('¿Nos cobras, por favor?');
    fireEvent.mouseUp(targetEl);

    expect(await screen.findByRole('dialog')).toBeDefined();
    const speakBtn = screen.getByLabelText('Listen to pronunciation');
    fireEvent.click(speakBtn);

    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const spoken = mockSpeak.mock.calls[0][0];
    expect(spoken.voice).toEqual(dummyVoices[0]);
    expect(spoken.text).toBe('cobras');
  });

  it('toggles Focus mode with F key and exits with Escape key', async () => {
    render(<DrillWorkspace articleId={articleId} onBack={vi.fn()} />);
    await screen.findByText('¿Nos cobras, por favor?');

    expect(screen.getByRole('button', { name: /focus mode/i })).toBeDefined();

    // Press F to enter Focus mode
    fireEvent.keyDown(window, { code: 'KeyF', key: 'f' });
    expect(screen.getByRole('button', { name: /exit focus/i })).toBeDefined();

    // Press F again to exit Focus mode
    fireEvent.keyDown(window, { code: 'KeyF', key: 'f' });
    expect(screen.getByRole('button', { name: /focus mode/i })).toBeDefined();

    // Press F to enter, then Escape to exit Focus mode
    fireEvent.keyDown(window, { code: 'KeyF', key: 'f' });
    expect(screen.getByRole('button', { name: /exit focus/i })).toBeDefined();

    fireEvent.keyDown(window, { code: 'Escape', key: 'Escape' });
    expect(screen.getByRole('button', { name: /focus mode/i })).toBeDefined();
  });

  it('handles audio play (P), pause (S), resume (P) state machine, and ignores S when not playing', async () => {
    await db.audios.add({
      id: 'audio-art-state-machine',
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
    await screen.findByText('¿Nos cobras, por favor?');

    const playSpy = vi.spyOn(playerEngine, 'play');
    const pauseSpy = vi.spyOn(playerEngine, 'pause');
    const seekSpy = vi.spyOn(playerEngine, 'seek');

    // 1. Audio not playing: Pressing S should be a NO-OP (pause not called)
    fireEvent.keyDown(window, { code: 'KeyS', key: 's' });
    expect(pauseSpy).not.toHaveBeenCalled();

    // 2. Press P to start playing audio
    fireEvent.keyDown(window, { code: 'KeyP', key: 'p' });
    expect(seekSpy).toHaveBeenCalledWith(0);
    expect(playSpy).toHaveBeenCalledTimes(1);

    // 3. Audio is now playing: Press S to pause audio
    fireEvent.keyDown(window, { code: 'KeyS', key: 's' });
    expect(pauseSpy).toHaveBeenCalledTimes(1);

    // 4. Audio is paused: Press S again should be a NO-OP
    fireEvent.keyDown(window, { code: 'KeyS', key: 's' });
    expect(pauseSpy).toHaveBeenCalledTimes(1);

    // 5. Audio is paused: Press P to resume playing (must NOT seek back to 0)
    seekSpy.mockClear();
    fireEvent.keyDown(window, { code: 'KeyP', key: 'p' });
    expect(seekSpy).not.toHaveBeenCalled();
    expect(playSpy).toHaveBeenCalledTimes(2);

    playSpy.mockRestore();
    pauseSpy.mockRestore();
    seekSpy.mockRestore();
  });

  it('opens and closes keyboard shortcuts modal via button and ? shortcut, and renders discovery hint', async () => {
    render(<DrillWorkspace articleId={articleId} onBack={vi.fn()} />);
    await screen.findByText('¿Nos cobras, por favor?');

    // Header shortcut button exists in non-focus mode
    const shortcutsBtn = screen.getByRole('button', { name: /keyboard shortcuts/i });
    expect(shortcutsBtn).toBeDefined();

    // Bottom discovery hint exists
    expect(screen.getByText(/for keyboard shortcuts/i)).toBeDefined();

    // Click button to open modal
    fireEvent.click(shortcutsBtn);
    expect(screen.getByRole('dialog', { name: /keyboard shortcuts/i })).toBeDefined();

    // Press Escape to close modal
    fireEvent.keyDown(window, { code: 'Escape', key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /keyboard shortcuts/i })).toBeNull();

    // Press ? (question mark) to open modal
    fireEvent.keyDown(window, { code: 'Slash', key: '?', shiftKey: true });
    expect(screen.getByRole('dialog', { name: /keyboard shortcuts/i })).toBeDefined();

    // Close via close button in modal
    fireEvent.click(screen.getByRole('button', { name: /close shortcuts/i }));
    expect(screen.queryByRole('dialog', { name: /keyboard shortcuts/i })).toBeNull();
  });
});


