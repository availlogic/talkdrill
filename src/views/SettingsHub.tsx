import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, AlertTriangle, Shield, Volume2, Sun, Moon, Laptop } from 'lucide-react';
import { settingsService } from '../services/settingsService';
import { themeManager } from '../utils/themeManager';
import { type AppSettings } from '../types/models';

export interface SettingsHubProps {
  onBack: () => void;
}

export const SettingsHub: React.FC<SettingsHubProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    settingsService.getSettings().then(setSettings);
  }, []);

  if (!settings) {
    return <div className="p-8 text-center text-slate-500">Loading settings...</div>;
  }

  const handleSaveTranslation = async (e: React.FormEvent) => {
    e.preventDefault();
    await settingsService.updateSettings({ translation: settings.translation });
    setStatusMessage('Translation configuration saved.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSaveTts = async (e: React.FormEvent) => {
    e.preventDefault();
    await settingsService.updateSettings({ tts: settings.tts });
    setStatusMessage('TTS configuration saved.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSelectTheme = async (theme: 'system' | 'light' | 'dark') => {
    const updated = { ...settings, theme };
    setSettings(updated);
    themeManager.setPreference(theme);
    await settingsService.updateSettings({ theme });
  };

  const handleExecutePurge = async () => {
    if (purgeConfirmText !== 'DELETE') return;
    await settingsService.clearAllLocalData();
    setPurgeConfirmText('');
    setStatusMessage('All local data has been permanently cleared.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Settings & Integrations</h2>
        <div className="w-12" />
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm rounded-xl text-center">
          {statusMessage}
        </div>
      )}

      {/* Theme Preference */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Sun className="w-5 h-5 text-amber-500 dark:text-amber-400" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Appearance & Theme</h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Choose between crisp Light mode, high-contrast Dark mode, or automatic synchronization with your operating system.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {(['system', 'light', 'dark'] as const).map((t) => {
            const isSelected = (settings.theme ?? 'system') === t;
            const labels = {
              system: 'System Default',
              light: 'Light Mode',
              dark: 'Dark Mode',
            };
            return (
              <button
                key={t}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleSelectTheme(t)}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500 shadow-sm'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {t === 'light' && <Sun className="w-3.5 h-3.5" />}
                {t === 'dark' && <Moon className="w-3.5 h-3.5" />}
                {t === 'system' && <Laptop className="w-3.5 h-3.5" />}
                <span>{labels[t]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Translation Config */}
      <form
        onSubmit={handleSaveTranslation}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Translation Engine (BYOK)</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label htmlFor="ant-base-url" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Anthropic-compatible Base URL
            </label>
            <input
              id="ant-base-url"
              type="text"
              value={settings.translation.baseUrl}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  translation: { ...settings.translation, baseUrl: e.target.value },
                })
              }
              placeholder="https://api.anthropic.com/v1 or /api/proxy/anthropic"
              className="w-full text-sm font-mono p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Supports Anthropic, MiniMax, OpenRouter, custom proxy, or same-origin /api/proxy/anthropic.
            </p>
          </div>

          <div>
            <label htmlFor="ant-model" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Model Name
            </label>
            <input
              id="ant-model"
              type="text"
              value={settings.translation.model}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  translation: { ...settings.translation, model: e.target.value },
                })
              }
              placeholder="claude-3-5-sonnet-20241022"
              className="w-full text-sm font-mono p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="ant-key" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              API Key
            </label>
            <input
              id="ant-key"
              type="password"
              value={settings.translation.apiKey}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  translation: { ...settings.translation, apiKey: e.target.value },
                })
              }
              placeholder="sk-ant-..."
              className="w-full text-sm font-mono p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Save Translation Settings</span>
          </button>
        </div>
      </form>

      {/* TTS Config */}
      <form
        onSubmit={handleSaveTts}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Text-to-Speech (TTS) Configuration</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="tts-prov" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Provider
            </label>
            <select
              id="tts-prov"
              value={settings.tts.provider}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  tts: {
                    ...settings.tts,
                    provider: e.target.value as 'openai' | 'elevenlabs' | 'minimax' | 'minimaxi' | 'custom',
                  },
                })
              }
              className="w-full text-sm p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="openai">OpenAI (TTS-1)</option>
              <option value="elevenlabs">ElevenLabs</option>
              <option value="minimax">MiniMax</option>
              <option value="custom">Custom HTTP API</option>
            </select>
          </div>

          <div>
            <label htmlFor="tts-voice" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Voice ID / Model
            </label>
            <input
              id="tts-voice"
              type="text"
              value={settings.tts.modelOrVoiceId}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  tts: { ...settings.tts, modelOrVoiceId: e.target.value },
                })
              }
              placeholder="alloy / shimmer"
              className="w-full text-sm font-mono p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div>
          <label htmlFor="tts-key" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            TTS API Key
          </label>
          <input
            id="tts-key"
            type="password"
            value={settings.tts.apiKey}
            onChange={(e) =>
              setSettings({
                ...settings,
                tts: { ...settings.tts, apiKey: e.target.value },
              })
            }
            placeholder="sk-..."
            className="w-full text-sm font-mono p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Save TTS Settings</span>
          </button>
        </div>
      </form>

      {/* Danger Zone: Purge */}
      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-bold">Danger Zone: Clear All Local Data</h3>
        </div>
        <p className="text-xs text-rose-600 dark:text-rose-400">
          Permanently deletes all drills, audio recordings, tally history, and configured API keys from local IndexedDB. This action cannot be undone.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={purgeConfirmText}
            onChange={(e) => setPurgeConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="flex-1 text-sm font-mono p-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            disabled={purgeConfirmText !== 'DELETE'}
            onClick={handleExecutePurge}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold rounded-xl"
          >
            Purge All Data
          </button>
        </div>
      </div>
    </div>
  );
};
