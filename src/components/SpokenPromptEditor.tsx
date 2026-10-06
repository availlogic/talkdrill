import React from 'react';
import { RotateCcw } from 'lucide-react';
import { DEFAULT_PROMPTS } from '../services/translationService';

export interface PromptLangTab {
  key: string;
  label: string;
}

export const PROMPT_LANG_TABS: PromptLangTab[] = [
  { key: 'es-ES', label: 'Spanish (es-ES)' },
  { key: 'ja-JP', label: 'Japanese (ja-JP)' },
  { key: 'fr-FR', label: 'French (fr-FR)' },
  { key: 'de-DE', label: 'German (de-DE)' },
  { key: 'en-US', label: 'English (en-US)' },
  { key: 'default', label: 'Others (Default)' },
];

export interface SpokenPromptEditorProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  prompts?: Record<string, string> | undefined;
  onPromptChange: (tab: string, value: string) => void;
  onRestoreDefault: (tab: string) => void;
}

export const SpokenPromptEditor: React.FC<SpokenPromptEditorProps> = ({
  activeTab,
  onSelectTab,
  prompts,
  onPromptChange,
  onRestoreDefault,
}) => {
  const currentTab = PROMPT_LANG_TABS.find((t) => t.key === activeTab) || PROMPT_LANG_TABS[0];
  const currentValue = prompts?.[activeTab] ?? DEFAULT_PROMPTS[activeTab] ?? DEFAULT_PROMPTS.default;
  const isCustomized = Boolean(prompts?.[activeTab] && prompts[activeTab] !== (DEFAULT_PROMPTS[activeTab] || DEFAULT_PROMPTS.default));

  return (
    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor="prompt-editor" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Spoken Translation Prompts
        </label>
        {isCustomized && (
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            Customized
          </span>
        )}
      </div>

      <div role="tablist" aria-label="Spoken Translation Languages" className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {PROMPT_LANG_TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => onSelectTab(tab.key)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Spoken Prompt for {currentTab.label}
          </span>
          <button
            type="button"
            onClick={() => onRestoreDefault(activeTab)}
            className="text-[11px] text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 font-semibold flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restore Default</span>
          </button>
        </div>

        <textarea
          id="prompt-editor"
          aria-label={`Spoken Prompt for ${currentTab.label}`}
          rows={4}
          value={currentValue}
          onChange={(e) => onPromptChange(activeTab, e.target.value)}
          className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-y focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
        />
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Tip: Keep &quot;Preserve exact line break structure&quot; and &quot;Output ONLY the translated spoken text&quot; to maintain sentence alignment for drilling.
        </p>
      </div>
    </div>
  );
};
