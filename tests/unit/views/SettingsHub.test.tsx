import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsHub } from '../../../src/views/SettingsHub';
import { settingsService } from '../../../src/services/settingsService';
import { db } from '../../../src/storage/db';

describe('SettingsHub View (TDD)', () => {
  beforeEach(async () => {
    await db.settings.clear();
  });

  it('renders decoupled Translation and TTS BYOK forms without mechanical click or sound feedback', async () => {
    render(<SettingsHub onBack={vi.fn()} />);

    expect(await screen.findByText('Translation Engine (BYOK)')).toBeDefined();
    expect(screen.getByText('Text-to-Speech (TTS) Configuration')).toBeDefined();
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

  it('updates and saves TTS provider settings', async () => {
    render(<SettingsHub onBack={vi.fn()} />);

    const provSelect = (await screen.findByLabelText('Provider')) as HTMLSelectElement;
    fireEvent.change(provSelect, { target: { value: 'elevenlabs' } });

    const voiceInput = screen.getByLabelText('Voice ID / Model') as HTMLInputElement;
    fireEvent.change(voiceInput, { target: { value: 'rachel' } });

    const keyInput = screen.getByLabelText('TTS API Key') as HTMLInputElement;
    fireEvent.change(keyInput, { target: { value: 'el-key-123' } });

    const saveTtsBtn = screen.getByRole('button', { name: 'Save TTS Settings' });
    fireEvent.click(saveTtsBtn);

    await waitFor(async () => {
      const saved = await settingsService.getSettings();
      expect(saved.tts.provider).toBe('elevenlabs');
      expect(saved.tts.modelOrVoiceId).toBe('rachel');
      expect(saved.tts.apiKey).toBe('el-key-123');
    });
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
});
