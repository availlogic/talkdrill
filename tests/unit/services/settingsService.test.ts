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
    expect(settings.theme).toBe('system');
    expect(settings.translation.enabled).toBe(true);
    expect(settings.translation.baseUrl).toBe('https://api.anthropic.com/v1');
    expect(settings.translation.customPrompts?.['es-ES']).toContain('Castilian Spanish');
    expect(settings.translation.customPrompts?.['ja-JP']).toContain('Japanese');
    expect(settings.translation.customPrompts?.['fr-FR']).toContain('French');
    expect(settings.translation.customPrompts?.['de-DE']).toContain('German');
    expect(settings.translation.customPrompts?.['en-US']).toContain('American English');
    expect(settings.translation.customPrompts?.default).toContain('expert native translator');
    expect(settings.tts.provider).toBe('openai');
    expect(settings.printOptions.defaultTallyBoxes).toBe(100);
    expect(settings.dictionary.hotkey).toBe('Alt');
    expect(settings.dictionary.cacheTtlDays).toBe(2);
    expect(settings.dictionary.voiceURI).toBe('');
  });


  it('updates specific settings independently', async () => {
    await service.updateSettings({
      theme: 'dark',
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
      printOptions: {
        defaultTallyBoxes: 60,
      },
      dictionary: {
        voiceURI: 'com.apple.speech.synthesis.voice.Monica',
        hotkey: 'Meta',
        cacheTtlDays: 7,
      },
    });

    const current = await service.getSettings();
    expect(current.theme).toBe('dark');
    expect(current.translation.apiKey).toBe('sk-ant-custom');
    expect(current.translation.baseUrl).toBe('https://my-proxy.workers.dev');
    expect(current.tts.provider).toBe('elevenlabs');
    expect(current.printOptions.defaultTallyBoxes).toBe(60);
    expect(current.dictionary.voiceURI).toBe('com.apple.speech.synthesis.voice.Monica');
    expect(current.dictionary.hotkey).toBe('Meta');
    expect(current.dictionary.cacheTtlDays).toBe(7);
  });


  it('resets settings to default values', async () => {
    await service.updateSettings({
      theme: 'dark',
      translation: {
        enabled: false,
        baseUrl: 'https://custom',
        apiKey: 'key',
        model: 'm',
      },
    });

    const res = await service.resetSettings();
    expect(res.theme).toBe('system');
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
