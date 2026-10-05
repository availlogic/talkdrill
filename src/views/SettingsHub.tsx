import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, AlertTriangle, Shield, Sun, Moon, Laptop, BookOpen, Trash2, Volume2 } from 'lucide-react';
import { settingsService } from '../services/settingsService';
import { DictionaryService } from '../services/dictionaryService';
import { themeManager } from '../utils/themeManager';
import { speakText } from '../utils/speechHelper';
import { type AppSettings } from '../types/models';

export interface SettingsHubProps {
  onBack: () => void;
}

export const SettingsHub: React.FC<SettingsHubProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    settingsService.getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;

    const updateVoices = () => {
      setBrowserVoices(synth.getVoices ? synth.getVoices() : []);
    };

    updateVoices();
    synth.addEventListener?.('voiceschanged', updateVoices);
    return () => {
      synth.removeEventListener?.('voiceschanged', updateVoices);
    };
  }, []);

  if (!settings) {
    return <div className="p-8 text-center text-slate-500">Loading settings...</div>;
  }

  const handleTestVoice = () => {
    const voiceURI = settings.dictionary?.voiceURI;
    speakText('Hello! This is a pronunciation test.', 'en-US', voiceURI);
  };

  const handleSaveTranslation = async (e: React.FormEvent) => {
    e.preventDefault();
    await settingsService.updateSettings({ translation: settings.translation });
    setStatusMessage('Translation configuration saved.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSaveDictionary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settings.dictionary) {
      await settingsService.updateSettings({ dictionary: settings.dictionary });
      setStatusMessage('Dictionary configuration saved.');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleClearDictionaryCache = async () => {
    const dictService = new DictionaryService();
    await dictService.clearCache();
    setStatusMessage('Dictionary cache cleared successfully.');
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

          <div className="pt-1">
            <label htmlFor="ant-use-proxy" className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                id="ant-use-proxy"
                type="checkbox"
                checked={settings.translation.useProxy ?? false}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    translation: { ...settings.translation, useProxy: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Route through Cloudflare Same-Origin Proxy (/api/proxy/anthropic)</span>
            </label>
            <p className="mt-0.5 ml-6 text-[11px] text-slate-500 dark:text-slate-400">
              Eliminates browser CORS preflight restrictions when deploying on Cloudflare Pages.
            </p>
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

      {/* Word Lookup & Dictionary */}
      <form
        onSubmit={handleSaveDictionary}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-500" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Word Lookup & Dictionary</h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Configure the trigger hotkey for looking up definitions with AI when text is selected, and set cache retention duration.
        </p>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="dict-voice" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pronunciation Voice (Browser Speech)
              </label>
              <button
                type="button"
                aria-label="Play Sample"
                onClick={handleTestVoice}
                className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1 font-medium transition cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Play Sample</span>
              </button>
            </div>
            <select
              id="dict-voice"
              value={settings.dictionary?.voiceURI ?? ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  dictionary: {
                    ...(settings.dictionary ?? { hotkey: 'Alt', cacheTtlDays: 2 }),
                    voiceURI: e.target.value,
                  },
                })
              }
              className="w-full text-sm p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="">System Default (Auto-detect by language)</option>
              {browserVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang}){v.default ? ' [Default]' : ''}
                </option>
              ))}
              {settings.dictionary?.voiceURI &&
                !browserVoices.some((v) => v.voiceURI === settings.dictionary?.voiceURI) && (
                  <option value={settings.dictionary.voiceURI}>
                    {settings.dictionary.voiceURI} (Unavailable)
                  </option>
                )}
            </select>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Select the browser voice used to pronounce selected words in the lookup popup.
            </p>
          </div>

          <div>
            <label htmlFor="dict-hotkey" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lookup Hotkey Trigger
            </label>
            <select
              id="dict-hotkey"
              value={settings.dictionary?.hotkey ?? 'Alt'}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  dictionary: {
                    ...(settings.dictionary ?? { cacheTtlDays: 2 }),
                    hotkey: e.target.value,
                  },
                })
              }
              className="w-full text-sm p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="Alt">Option / Alt (Any)</option>
              <option value="AltLeft">Left Option only</option>
              <option value="Meta">Command ⌘ (Any)</option>
              <option value="MetaLeft">Left Command ⌘ only</option>
              <option value="Control">Control (Any)</option>
              <option value="ControlLeft">Left Control only</option>
              <option value="Shift">Shift</option>
              <option value="KeyD">Key D</option>
            </select>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              When text is highlighted, press this key to query AI. Cached words display automatically without hotkey.
            </p>
          </div>

          <div>
            <label htmlFor="dict-cache-ttl" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Cache Retention Period
            </label>
            <select
              id="dict-cache-ttl"
              value={settings.dictionary?.cacheTtlDays ?? 2}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  dictionary: {
                    ...(settings.dictionary ?? { hotkey: 'Alt' }),
                    cacheTtlDays: Number(e.target.value),
                  },
                })
              }
              className="w-full text-sm p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="1">1 Day</option>
              <option value="2">2 Days (Default)</option>
              <option value="7">7 Days</option>
              <option value="30">30 Days</option>
              <option value="0">Forever (No Expiration)</option>
            </select>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Cached definitions older than this period will be automatically expired and cleared.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleClearDictionaryCache}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Dictionary Cache</span>
          </button>

          <button
            type="submit"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Dictionary Settings</span>
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
