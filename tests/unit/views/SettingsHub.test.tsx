import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsHub } from '../../../src/views/SettingsHub';
import { settingsService } from '../../../src/services/settingsService';
import { db } from '../../../src/storage/db';

describe('SettingsHub View (TDD)', () => {
  const originalSpeechSynthesis = window.speechSynthesis;
  const originalUtterance = window.SpeechSynthesisUtterance;
  let mockSpeak: ReturnType<typeof vi.fn>;
  let mockCancel: ReturnType<typeof vi.fn>;
  let mockGetVoices: ReturnType<typeof vi.fn>;

  const dummyVoices = [
    { voiceURI: 'es-voice-1', name: 'Monica', lang: 'es-ES', default: true },
    { voiceURI: 'en-voice-1', name: 'Samantha', lang: 'en-US', default: false },
  ];

  beforeEach(async () => {
    await db.settings.clear();

    mockSpeak = vi.fn();
    mockCancel = vi.fn();
    mockGetVoices = vi.fn().mockReturnValue(dummyVoices);

    const mockSynth = {
      speak: mockSpeak,
      cancel: mockCancel,
      getVoices: mockGetVoices,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    class MockUtterance {
      text: string;
      lang = '';
      voice: unknown = null;
      constructor(text: string) {
        this.text = text;
      }
    }

    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSynth,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: MockUtterance,
      writable: true,
      configurable: true,
    });
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

  it('renders decoupled Translation and theme settings without TTS form in current version', async () => {
    render(<SettingsHub onBack={vi.fn()} />);

    expect(await screen.findByText('Translation Engine (BYOK)')).toBeDefined();
    expect(screen.queryByText('Text-to-Speech (TTS) Configuration')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save TTS Settings' })).toBeNull();
    expect(screen.queryByText('Mechanical Click Sound Feedback')).toBeNull();
    expect(screen.queryByText('Drill Preferences')).toBeNull();
  });

  it('renders and saves Translation configuration in exact order: Base URL, Model Name, API Key', async () => {
    render(<SettingsHub onBack={vi.fn()} />);

    // Verify labels exist
    const urlInput = (await screen.findByLabelText(/Anthropic-compatible Base URL/i)) as HTMLInputElement;
    const modelInput = (await screen.findByLabelText(/Model Name/i)) as HTMLInputElement;
    const keyInput = (await screen.findByLabelText(/^API Key/i)) as HTMLInputElement;

    // Verify DOM order: URL precedes Model, Model precedes Key
    expect(urlInput.compareDocumentPosition(modelInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(modelInput.compareDocumentPosition(keyInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.change(urlInput, { target: { value: 'https://custom-proxy.internal/v1' } });
    fireEvent.change(modelInput, { target: { value: 'claude-3-7-sonnet' } });
    fireEvent.change(keyInput, { target: { value: 'sk-ant-test-key' } });

    const saveBtn = screen.getByRole('button', { name: 'Save Translation Settings' });
    fireEvent.click(saveBtn);

    await waitFor(async () => {
      const saved = await settingsService.getSettings();
      expect(saved.translation.baseUrl).toBe('https://custom-proxy.internal/v1');
      expect(saved.translation.model).toBe('claude-3-7-sonnet');
      expect(saved.translation.apiKey).toBe('sk-ant-test-key');
    });
  });

  it('renders and saves useProxy checkbox for Cloudflare Pages proxy in Translation configuration', async () => {
    render(<SettingsHub onBack={vi.fn()} />);

    const proxyCheckbox = (await screen.findByLabelText(/Route through Cloudflare Same-Origin Proxy/i)) as HTMLInputElement;
    expect(proxyCheckbox).toBeDefined();
    expect(proxyCheckbox.checked).toBe(true);

    fireEvent.click(proxyCheckbox);
    expect(proxyCheckbox.checked).toBe(false);

    const saveBtn = screen.getByRole('button', { name: 'Save Translation Settings' });
    fireEvent.click(saveBtn);

    await waitFor(async () => {
      const saved = await settingsService.getSettings();
      expect(saved.translation.useProxy).toBe(false);
    });
  });

  it('requires typing DELETE to execute atomic database purge', async () => {
    render(<SettingsHub onBack={vi.fn()} />);

    const purgeInput = (await screen.findByPlaceholderText('Type DELETE to confirm')) as HTMLInputElement;
    const purgeBtn = screen.getByRole('button', { name: 'Purge All Data' }) as HTMLButtonElement;

    expect(purgeBtn.disabled).toBe(true);

    fireEvent.change(purgeInput, { target: { value: 'DELETE' } });
    expect(purgeBtn.disabled).toBe(false);

    fireEvent.click(purgeBtn);
    await waitFor(async () => {
      expect(await screen.findByText('All local data has been permanently cleared.')).toBeDefined();
    });
  });

  it('does not expose TTS configuration inputs or save button in current release', async () => {
    render(<SettingsHub onBack={vi.fn()} />);

    expect(await screen.findByText('Translation Engine (BYOK)')).toBeDefined();
    expect(screen.queryByLabelText('Provider')).toBeNull();
    expect(screen.queryByLabelText('Voice ID / Model')).toBeNull();
    expect(screen.queryByLabelText('TTS API Key')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save TTS Settings' })).toBeNull();
  });

  it('calls onBack callback when back button is clicked', async () => {
    const backSpy = vi.fn();
    render(<SettingsHub onBack={backSpy} />);

    const backBtn = await screen.findByRole('button', { name: 'Back' });
    fireEvent.click(backBtn);
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('switches and saves theme preference', async () => {
    render(<SettingsHub onBack={vi.fn()} />);

    const darkBtn = await screen.findByRole('button', { name: /Dark Mode/i });
    fireEvent.click(darkBtn);

    await waitFor(async () => {
      const saved = await settingsService.getSettings();
      expect(saved.theme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('renders and saves Dictionary configuration: hotkey trigger and cache retention period', async () => {
    render(<SettingsHub onBack={vi.fn()} />);

    const hotkeySelect = (await screen.findByLabelText(/Lookup Hotkey Trigger/i)) as HTMLSelectElement;
    const ttlSelect = (await screen.findByLabelText(/Cache Retention Period/i)) as HTMLSelectElement;

    expect(hotkeySelect.value).toBe('Alt');
    expect(ttlSelect.value).toBe('2');

    fireEvent.change(hotkeySelect, { target: { value: 'MetaLeft' } });
    fireEvent.change(ttlSelect, { target: { value: '7' } });

    const saveBtn = screen.getByRole('button', { name: 'Save Dictionary Settings' });
    fireEvent.click(saveBtn);

    await waitFor(async () => {
      const saved = await settingsService.getSettings();
      expect(saved.dictionary?.hotkey).toBe('MetaLeft');
      expect(saved.dictionary?.cacheTtlDays).toBe(7);
      expect(await screen.findByText('Dictionary configuration saved.')).toBeDefined();
    });
  });

  it('clears dictionary cache when clicking Clear Dictionary Cache button', async () => {
    await db.wordLookups.add({
      text: 'hola',
      lang: 'es-ES',
      translation: 'hello',
      timestamp: Date.now(),
    });
    expect(await db.wordLookups.count()).toBe(1);

    render(<SettingsHub onBack={vi.fn()} />);

    const clearBtn = await screen.findByRole('button', { name: /Clear Dictionary Cache/i });
    fireEvent.click(clearBtn);

    await waitFor(async () => {
      expect(await db.wordLookups.count()).toBe(0);
      expect(await screen.findByText('Dictionary cache cleared successfully.')).toBeDefined();
    });
  });

  it('renders pronunciation voice select as the FIRST item in Word Lookup & Dictionary, and saves selected voice', async () => {
    render(<SettingsHub onBack={vi.fn()} />);

    const voiceSelect = (await screen.findByLabelText(/Pronunciation Voice/i)) as HTMLSelectElement;
    const hotkeySelect = (await screen.findByLabelText(/Lookup Hotkey Trigger/i)) as HTMLSelectElement;
    const ttlSelect = (await screen.findByLabelText(/Cache Retention Period/i)) as HTMLSelectElement;

    // Verify DOM order: Voice precedes Hotkey, Hotkey precedes Cache TTL
    expect(voiceSelect.compareDocumentPosition(hotkeySelect) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hotkeySelect.compareDocumentPosition(ttlSelect) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(voiceSelect.value).toBe('');
    fireEvent.change(voiceSelect, { target: { value: 'es-voice-1' } });
    expect(voiceSelect.value).toBe('es-voice-1');

    const saveBtn = screen.getByRole('button', { name: 'Save Dictionary Settings' });
    fireEvent.click(saveBtn);

    await waitFor(async () => {
      const saved = await settingsService.getSettings();
      expect(saved.dictionary?.voiceURI).toBe('es-voice-1');
      expect(await screen.findByText('Dictionary configuration saved.')).toBeDefined();
    });
  });

  it('allows testing the selected pronunciation voice with Play Sample button', async () => {
    render(<SettingsHub onBack={vi.fn()} />);

    const voiceSelect = (await screen.findByLabelText(/Pronunciation Voice/i)) as HTMLSelectElement;
    fireEvent.change(voiceSelect, { target: { value: 'es-voice-1' } });

    const playBtn = await screen.findByRole('button', { name: /Play Sample|Test Voice/i });
    fireEvent.click(playBtn);

    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const utterance = mockSpeak.mock.calls[0][0];
    expect(utterance.voice).toEqual(dummyVoices[0]);
  });

  it('renders spoken translation prompt tabs with default prompts and allows tab switching', async () => {
    render(<SettingsHub onBack={vi.fn()} />);

    // Check heading/label
    expect(await screen.findByText('Spoken Translation Prompts')).toBeDefined();

    // Verify all tabs exist
    const spanishTab = screen.getByRole('tab', { name: /Spanish/i });
    const japaneseTab = screen.getByRole('tab', { name: /Japanese/i });
    const frenchTab = screen.getByRole('tab', { name: /French/i });
    const germanTab = screen.getByRole('tab', { name: /German/i });
    const englishTab = screen.getByRole('tab', { name: /English/i });
    const defaultTab = screen.getByRole('tab', { name: /Others/i });

    expect(spanishTab).toBeDefined();
    expect(japaneseTab).toBeDefined();
    expect(frenchTab).toBeDefined();
    expect(germanTab).toBeDefined();
    expect(englishTab).toBeDefined();
    expect(defaultTab).toBeDefined();

    // Textarea shows Castilian Spanish initially
    const textarea = screen.getByLabelText(/Spoken Prompt for/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('Castilian Spanish');

    // Switch to Japanese
    fireEvent.click(japaneseTab);
    expect(textarea.value).toContain('conversational Japanese');

    // Switch to French
    fireEvent.click(frenchTab);
    expect(textarea.value).toContain('French spoken fluency');

    // Switch to Others (Default)
    fireEvent.click(defaultTab);
    expect(textarea.value).toContain('expert native translator');
  });

  it('allows editing prompts per language and persists them upon saving', async () => {
    render(<SettingsHub onBack={vi.fn()} />);

    const spanishTab = await screen.findByRole('tab', { name: /Spanish/i });
    fireEvent.click(spanishTab);

    const textarea = screen.getByLabelText(/Spoken Prompt for/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Mexican Spanish custom prompt test' } });

    const saveBtn = screen.getByRole('button', { name: 'Save Translation Settings' });
    fireEvent.click(saveBtn);

    await waitFor(async () => {
      const saved = await settingsService.getSettings();
      expect(saved.translation.customPrompts?.['es-ES']).toBe('Mexican Spanish custom prompt test');
      // Other defaults are preserved
      expect(saved.translation.customPrompts?.['ja-JP']).toContain('Japanese');
      expect(await screen.findByText('Translation configuration saved.')).toBeDefined();
    });
  });

  it('allows restoring default prompt for current language tab', async () => {
    render(<SettingsHub onBack={vi.fn()} />);

    const spanishTab = await screen.findByRole('tab', { name: /Spanish/i });
    fireEvent.click(spanishTab);

    const textarea = screen.getByLabelText(/Spoken Prompt for/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Changed text' } });
    expect(textarea.value).toBe('Changed text');

    const restoreBtn = screen.getByRole('button', { name: /Restore Default/i });
    fireEvent.click(restoreBtn);

    expect(textarea.value).toContain('Castilian Spanish');
  });
});
