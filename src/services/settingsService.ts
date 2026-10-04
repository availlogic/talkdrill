import { db } from '../storage/db';
import { type AppSettings } from '../types/models';

export const DEFAULT_SETTINGS: AppSettings = {
  translation: {
    enabled: true,
    baseUrl: 'https://api.anthropic.com/v1',
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022',
  },
  tts: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    modelOrVoiceId: 'alloy',
  },
  audioFeedback: {
    mechanicalClick: true,
  },
  printOptions: {
    defaultTallyBoxes: 100,
  },
};

const SETTINGS_KEY = 'app_settings';

export class SettingsService {
  async getSettings(): Promise<AppSettings> {
    const record = await db.settings.get(SETTINGS_KEY);
    if (!record) {
      return { ...DEFAULT_SETTINGS };
    }
    return {
      translation: { ...DEFAULT_SETTINGS.translation, ...record.value.translation },
      tts: { ...DEFAULT_SETTINGS.tts, ...record.value.tts },
      audioFeedback: { ...DEFAULT_SETTINGS.audioFeedback, ...record.value.audioFeedback },
      printOptions: { ...DEFAULT_SETTINGS.printOptions, ...record.value.printOptions },
    };
  }

  async updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated: AppSettings = {
      translation: partial.translation ? { ...current.translation, ...partial.translation } : current.translation,
      tts: partial.tts ? { ...current.tts, ...partial.tts } : current.tts,
      audioFeedback: partial.audioFeedback ? { ...current.audioFeedback, ...partial.audioFeedback } : current.audioFeedback,
      printOptions: partial.printOptions ? { ...current.printOptions, ...partial.printOptions } : current.printOptions,
    };

    await db.settings.put({
      key: SETTINGS_KEY,
      value: updated,
      updatedAt: Date.now(),
    });

    return updated;
  }

  async resetSettings(): Promise<AppSettings> {
    await db.settings.delete(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS };
  }

  async clearAllLocalData(): Promise<void> {
    await db.transaction('rw', [db.articles, db.audios, db.drillLogs, db.settings], async () => {
      await db.articles.clear();
      await db.audios.clear();
      await db.drillLogs.clear();
      await db.settings.clear();
    });
  }
}

export const settingsService = new SettingsService();
