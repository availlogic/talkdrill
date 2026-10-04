import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsHub } from '../../../src/views/SettingsHub';
import { settingsService } from '../../../src/services/settingsService';
import { db } from '../../../src/storage/db';

describe('SettingsHub View (TDD)', () => {
  beforeEach(async () => {
    await db.settings.clear();
  });

  it('renders decoupled Translation and TTS BYOK forms', async () => {
    render(<SettingsHub onBack={vi.fn()} />);

    expect(await screen.findByText('Translation Engine (BYOK)')).toBeDefined();
    expect(screen.getByText('Text-to-Speech (TTS) Configuration')).toBeDefined();
    expect(screen.getByText('Mechanical Click Sound Feedback')).toBeDefined();
  });

  it('saves Anthropic API key and proxy endpoint', async () => {
    render(<SettingsHub onBack={vi.fn()} />);

    const keyInput = (await screen.findByLabelText(/Anthropic API Key/i)) as HTMLInputElement;
    fireEvent.change(keyInput, { target: { value: 'sk-ant-test-key' } });

    const saveBtn = screen.getByRole('button', { name: 'Save Translation Settings' });
    fireEvent.click(saveBtn);

    await waitFor(async () => {
      const saved = await settingsService.getSettings();
      expect(saved.translation.apiKey).toBe('sk-ant-test-key');
    });
  });

  it('toggles mechanical click feedback', async () => {
    render(<SettingsHub onBack={vi.fn()} />);

    const toggle = (await screen.findByRole('switch', { name: /mechanical click feedback/i })) as HTMLInputElement;
    fireEvent.click(toggle);

    await waitFor(async () => {
      const saved = await settingsService.getSettings();
      expect(saved.audioFeedback.mechanicalClick).toBe(false);
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
