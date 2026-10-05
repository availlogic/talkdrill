import React, { useEffect, useRef } from 'react';
import { Volume2, X, Loader2 } from 'lucide-react';
import { speakText } from '../utils/speechHelper';
import type { WordLookupResult } from '../types/models';

export interface WordLookupPopoverProps {
  word: string;
  lang: string;
  x: number;
  y: number;
  loading: boolean;
  result: WordLookupResult | null;
  error: string | null;
  onClose: () => void;
  onSpeak?: (text: string, lang: string) => void;
}

export function calculatePopoverPosition(
  x: number,
  y: number,
  width = 320,
  height = 180,
  viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024,
  viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768
): { top: number; left: number } {
  const left = Math.max(12, Math.min(x, viewportWidth - width - 12));
  const fitsBelow = y + height + 12 <= viewportHeight;
  const top = fitsBelow ? y + 8 : Math.max(12, y - height - 8);
  return { top, left };
}

interface HeaderActionsProps {
  onSpeak: () => void;
  onClose: () => void;
}

const HeaderActions: React.FC<HeaderActionsProps> = ({ onSpeak, onClose }) => (
  <div className="flex items-center gap-1 shrink-0">
    <button
      type="button"
      aria-label="Listen to pronunciation"
      onClick={onSpeak}
      className="p-1 rounded-md text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
    >
      <Volume2 className="w-4 h-4" />
    </button>
    <button
      type="button"
      aria-label="Close lookup"
      onClick={onClose}
      className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);

interface HeaderProps {
  word: string;
  lang: string;
  ipa?: string | undefined;
  onClose: () => void;
  onSpeak: (text: string, lang: string) => void;
}

const PopoverHeader: React.FC<HeaderProps> = ({ word, lang, ipa, onClose, onSpeak }) => (
  <div className="flex items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-700/60 pb-2 mb-2">
    <div className="flex items-baseline gap-2 overflow-hidden">
      <span className="font-semibold text-stone-900 dark:text-stone-100 truncate text-base">
        {word}
      </span>
      {ipa && (
        <span className="text-xs font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
          {ipa}
        </span>
      )}
    </div>
    <HeaderActions onSpeak={() => onSpeak(word, lang)} onClose={onClose} />
  </div>
);

const DefinitionContent: React.FC<{ result: WordLookupResult }> = ({ result }) => (
  <div className="space-y-1.5 text-xs text-stone-700 dark:text-stone-300">
    {result.partOfSpeech && (
      <span className="inline-block text-[11px] font-medium text-stone-500 dark:text-stone-400 italic">
        {result.partOfSpeech}
      </span>
    )}
    <p className="text-stone-900 dark:text-stone-100 font-medium leading-relaxed">
      {result.translation}
    </p>
    {result.contextNote && (
      <p className="text-[11px] text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/80 p-1.5 rounded">
        {result.contextNote}
      </p>
    )}
    <div className="flex justify-end pt-1">
      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono font-semibold bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
        {result.source === 'cache' ? 'Cached' : 'AI'}
      </span>
    </div>
  </div>
);

interface BodyProps {
  loading: boolean;
  result: WordLookupResult | null;
  error: string | null;
}

const PopoverBody: React.FC<BodyProps> = ({ loading, result, error }) => {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 justify-center text-xs text-stone-500 dark:text-stone-400">
        <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
        <span>Looking up definition...</span>
      </div>
    );
  }
  if (error) {
    return <div className="py-2 text-xs text-rose-600 dark:text-rose-400">{error}</div>;
  }
  return result ? <DefinitionContent result={result} /> : null;
};

function usePopoverDismiss(ref: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handlePointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [ref, onClose]);
}

export const WordLookupPopover: React.FC<WordLookupPopoverProps> = ({
  word,
  lang,
  x,
  y,
  loading,
  result,
  error,
  onClose,
  onSpeak = (w, l) => speakText(w, l),
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const { top, left } = calculatePopoverPosition(x, y);
  usePopoverDismiss(popoverRef, onClose);

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Word Definition"
      style={{ top: `${top}px`, left: `${left}px` }}
      className="fixed z-50 w-72 sm:w-80 max-w-[calc(100vw-24px)] rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-3 shadow-2xl shadow-stone-900/10 dark:shadow-stone-950/40 animate-in fade-in zoom-in-95 duration-100"
    >
      <PopoverHeader word={word} lang={lang} ipa={result?.ipa} onClose={onClose} onSpeak={onSpeak} />
      <PopoverBody loading={loading} result={result} error={error} />
    </div>
  );
};
