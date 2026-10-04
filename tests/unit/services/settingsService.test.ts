import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../src/storage/db';
import { SettingsService } from '../../../src/services/settingsService';

describe('SettingsService (TDD)', () => {
  let service: SettingsService;

  beforeEach(async () => {
    await db.settings.clear();
    await db.articles.clear();
    await db.audios.clear();
    await db.drillLogs.clear();
    service = new SettingsService();
  });

  it('returns default settings when not previously configured', async () => {
    const settings = await service.getSettings();
    expect(settings.translation.enabled).toBe(true);
    expect(settings.translation.baseUrl).toBe('https://api.anthropic.com/v1');
    expect(settings.tts.provider).toBe('openai');
    expect(settings.audioFeedback.mechanicalClick).toBe(true);
    expect(settings.printOptions.defaultTallyBoxes).toBe(100);
  });

  it('updates specific settings independently', async () => {
    await service.updateSettings({
      translation: {
        enabled: true,
        baseUrl: 'https://my-proxy.workers.dev',
        apiKey: 'sk-ant-custom',
        model: 'claude-3-5-sonnet-20241022',
      },
      tts: {
        provider: 'elevenlabs',
        baseUrl: 'https://api.elevenlabs.io',
        apiKey: 'xi-key',
        modelOrVoiceId: 'voice-1',
      },
      audioFeedback: {
        mechanicalClick: false,
      },
      printOptions: {
        defaultTallyBoxes: 60,
      },
    });

    const current = await service.getSettings();
    expect(current.translation.apiKey).toBe('sk-ant-custom');
    expect(current.translation.baseUrl).toBe('https://my-proxy.workers.dev');
    expect(current.tts.provider).toBe('elevenlabs');
    expect(current.audioFeedback.mechanicalClick).toBe(false);
    expect(current.printOptions.defaultTallyBoxes).toBe(60);
  });

  it('resets settings to default values', async () => {
    await service.updateSettings({
      translation: {
        enabled: false,
        baseUrl: 'https://custom',
        apiKey: 'key',
        model: 'm',
      },
    });

    const res = await service.resetSettings();
    expect(res.translation.baseUrl).toBe('https://api.anthropic.com/v1');
    expect(res.translation.apiKey).toBe('');
  });

  it('clears all local data atomically', async () => {
    await db.articles.add({
      id: 'art-to-clear',
      title: 'To Clear',
      sourceText: 's',
      targetText: 't',
      sourceLang: 'en',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
      targetCount: 500,
      currentCount: 1,
      createdAt: 1000,
      updatedAt: 1000,
      isArchived: 0,
    });

    await service.clearAllLocalData();
    expect(await db.articles.count()).toBe(0);
    expect(await db.audios.count()).toBe(0);
    expect(await db.drillLogs.count()).toBe(0);
  });
});
