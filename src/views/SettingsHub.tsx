import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, AlertTriangle, Shield, Volume2 } from 'lucide-react';
import { settingsService } from '../services/settingsService';
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

  const handleToggleClick = async () => {
    const nextVal = !settings.audioFeedback.mechanicalClick;
    const updated = {
      ...settings,
      audioFeedback: { ...settings.audioFeedback, mechanicalClick: nextVal },
    };
    setSettings(updated);
    await settingsService.updateSettings({ audioFeedback: updated.audioFeedback });
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
            <label htmlFor="ant-key" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Anthropic API Key
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

          <div>
            <label htmlFor="ant-proxy" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              API Endpoint / Proxy URL
            </label>
            <input
              id="ant-proxy"
              type="url"
              value={settings.translation.baseUrl}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  translation: { ...settings.translation, baseUrl: e.target.value },
                })
              }
              placeholder="https://api.anthropic.com/v1"
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

      {/* Audio Feedback */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <h3 className="font-bold text-slate-900 dark:text-slate-100">Drill Preferences</h3>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Mechanical Click Sound Feedback</h4>
            <p className="text-xs text-slate-500">Triggers synthetic 12ms physical mechanical click sound on each Space repetition</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.audioFeedback.mechanicalClick}
            aria-label="Mechanical click feedback"
            onClick={handleToggleClick}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              settings.audioFeedback.mechanicalClick
                ? 'bg-blue-600 justify-end'
                : 'bg-slate-300 dark:bg-slate-700 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
          </button>
        </div>
      </div>

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
