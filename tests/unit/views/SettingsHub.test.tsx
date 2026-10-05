import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsHub } from '../../../src/views/SettingsHub';
import { settingsService } from '../../../src/services/settingsService';
import { db } from '../../../src/storage/db';

describe('SettingsHub View (TDD)', () => {
  beforeEach(async () => {
    await db.settings.clear();
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
});
