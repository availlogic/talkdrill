import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Upload, Volume2, Play, Check } from 'lucide-react';
import { corpusService } from '../services/corpusService';
import { translationService } from '../services/translationService';
import { audioService } from '../services/audioService';
import { settingsService } from '../services/settingsService';
import { type LanguageMode } from '../types/models';

export interface CorpusStudioProps {
  onCancel: () => void;
  onStartDrill: (articleId: string) => void;
}

export const CorpusStudio: React.FC<CorpusStudioProps> = ({ onCancel, onStartDrill }) => {
  const [mode, setMode] = useState<LanguageMode>('direct_foreign');
  const [title, setTitle] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [targetLang, setTargetLang] = useState('es-ES');
  const [targetCount, setTargetCount] = useState<number>(500);
  const [translating, setTranslating] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isGeneratingTts, setIsGeneratingTts] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setTranslating(true);
    setErrorMessage(null);
    try {
      const settings = await settingsService.getSettings();
      const result = await translationService.translate({
        sourceText,
        sourceLang: 'zh-CN',
        targetLang,
        apiKey: settings.translation.apiKey || 'mock-key',
        baseUrl: settings.translation.baseUrl,
        model: settings.translation.model,
        customPrompt: settings.translation.customPrompt,
      });
      setTargetText(result.translatedText);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Translation failed. Please verify API key and proxy settings.');
    } finally {
      setTranslating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await corpusService.parseTextFile(file);
      if (mode === 'direct_foreign') setTargetText(content);
      else setSourceText(content);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to parse text file.');
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const blob = await audioService.processLocalAudioUpload(file);
      setAudioBlob(blob);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Audio upload failed.');
    }
  };

  const handleGenerateTts = async () => {
    const textToSpeak = targetText.trim();
    if (!textToSpeak) return;
    setIsGeneratingTts(true);
    setErrorMessage(null);
    try {
      const blob = await audioService.generateSpeech({ text: textToSpeak, voice: 'alloy' });
      setAudioBlob(blob);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'TTS synthesis failed. Please verify TTS API key in Settings.');
    } finally {
      setIsGeneratingTts(false);
    }
  };

  const handleSaveAndDrill = async () => {
    const finalTarget = mode === 'direct_foreign' ? targetText.trim() : targetText.trim();
    if (!finalTarget) {
      setErrorMessage('Drill text content cannot be empty.');
      return;
    }

    try {
      const article = await corpusService.createArticle({
        title: title.trim() || 'Untitled Drill',
        sourceText: mode === 'translate_needed' ? sourceText.trim() : '',
        targetText: finalTarget,
        sourceLang: mode === 'translate_needed' ? 'zh-CN' : targetLang,
        targetLang,
        mode,
        targetCount,
      });

      if (audioBlob) {
        await audioService.saveAudioBlob(article.id, audioBlob);
      }

      onStartDrill(article.id);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save drill.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancel</span>
        </button>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Corpus Studio</h2>
        <div className="w-12" />
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm rounded-xl text-center">
          {errorMessage}
        </div>
      )}

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          aria-pressed={mode === 'direct_foreign'}
          onClick={() => setMode('direct_foreign')}
          className={`p-3 rounded-2xl border text-sm font-semibold transition-all ${
            mode === 'direct_foreign'
              ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-xs'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          Direct Foreign Text
        </button>
        <button
          type="button"
          aria-pressed={mode === 'translate_needed'}
          onClick={() => setMode('translate_needed')}
          className={`p-3 rounded-2xl border text-sm font-semibold transition-all ${
            mode === 'translate_needed'
              ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-xs'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          AI Spoken Translation
        </button>
      </div>

      {/* Target Lang & Target Reps */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="target-lang-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Target Language
          </label>
          <select
            id="target-lang-select"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="w-full text-sm p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="es-ES">Spanish (Castilian Spanish)</option>
            <option value="en-US">English (US)</option>
            <option value="ja-JP">Japanese</option>
            <option value="fr-FR">French</option>
            <option value="de-DE">German</option>
          </select>
        </div>

        <div>
          <label htmlFor="target-count-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Muscle Memory Target Reps
          </label>
          <select
            id="target-count-select"
            value={targetCount}
            onChange={(e) => setTargetCount(Number(e.target.value))}
            className="w-full text-sm p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
          >
            <option value={300}>300 reps (60 boxes - Muscle Stabilization)</option>
            <option value={500}>500 reps (100 boxes - Instinctive Mastery)</option>
          </select>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Drill Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter drill title (optional)"
          className="w-full text-sm p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        />
      </div>

      {/* Text Area based on Mode */}
      {mode === 'translate_needed' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Source Draft Input
            </label>
            <textarea
              rows={4}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Enter original text or expression draft to translate into idiomatic spoken target text..."
              className="w-full text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none"
            />
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleTranslate}
                disabled={translating || !sourceText.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm shadow-blue-500/20 disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{translating ? 'Translating with AI...' : 'Translate to Spoken Target'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Spoken Drill Text (Editable)
            </label>
            <textarea
              rows={4}
              value={targetText}
              onChange={(e) => setTargetText(e.target.value)}
              placeholder="Translated spoken target text will appear here..."
              className="w-full text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 resize-none font-medium"
            />
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Target Shadowing Text
            </label>
            <label className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1">
              <Upload className="w-3 h-3" />
              <span>Import .txt File</span>
              <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
          <textarea
            rows={5}
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
            placeholder="Enter or paste foreign text here..."
            className="w-full text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 resize-none font-medium"
          />
        </div>
      )}

      {/* Audio Generation & Upload Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Native Reference Audio</span>
        </h4>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerateTts}
            disabled={isGeneratingTts || !targetText.trim()}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isGeneratingTts ? 'Generating TTS...' : 'Generate AI Voice (TTS)'}</span>
          </button>

          <label className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Local Audio (.mp3, .wav)</span>
            <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
          </label>

          {audioBlob && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Audio Ready ({(audioBlob.size / 1024).toFixed(0)} KB)</span>
            </span>
          )}
        </div>
      </div>

      {/* Submit CTA */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSaveAndDrill}
          disabled={!targetText.trim()}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-transform active:scale-95"
        >
          <Play className="w-4 h-4" />
          <span>Save and Start Drill</span>
        </button>
      </div>
    </div>
  );
};
