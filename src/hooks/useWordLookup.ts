import { useState, useCallback, useEffect, useRef } from 'react';
import { DictionaryService } from '../services/dictionaryService';
import { settingsService } from '../services/settingsService';
import { isMatchingHotkey, getHotkeyDisplayLabel } from '../utils/hotkeyHelper';
import type { AppSettings, WordLookupResult } from '../types/models';

export interface SettingsReader {
  getSettings(): Promise<AppSettings>;
}

export interface WordLookupState {
  isOpen: boolean;
  word: string;
  lang: string;
  x: number;
  y: number;
  loading: boolean;
  isPendingTrigger: boolean;
  result: WordLookupResult | null;
  error: string | null;
}

export const INITIAL_LOOKUP_STATE: WordLookupState = {
  isOpen: false,
  word: '',
  lang: '',
  x: 0,
  y: 0,
  loading: false,
  isPendingTrigger: false,
  result: null,
  error: null,
};

export function extractSelectedTextAndCoords(): { text: string; x: number; y: number } | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }
  const text = selection.toString().trim();
  if (!text) {
    return null;
  }
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  return {
    text,
    x: rect.left,
    y: rect.bottom,
  };
}

function createHitState(
  text: string,
  lang: string,
  coords: { x: number; y: number },
  result: WordLookupResult
): WordLookupState {
  return {
    isOpen: true,
    word: text,
    lang,
    x: coords.x,
    y: coords.y,
    loading: false,
    isPendingTrigger: false,
    result,
    error: null,
  };
}

function createPendingState(
  text: string,
  lang: string,
  coords: { x: number; y: number }
): WordLookupState {
  return {
    isOpen: true,
    word: text,
    lang,
    x: coords.x,
    y: coords.y,
    loading: false,
    isPendingTrigger: true,
    result: null,
    error: null,
  };
}

export function useWordLookup(
  dictionaryService = new DictionaryService(),
  customSettingsService: SettingsReader = settingsService
) {
  const [lookupState, setLookupState] = useState<WordLookupState>(INITIAL_LOOKUP_STATE);
  const [hotkey, setHotkey] = useState<string>('Alt');
  const contextSentenceRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    customSettingsService.getSettings().then((s) => {
      if (s.dictionary?.hotkey) {
        setHotkey(s.dictionary.hotkey);
      }
    });
  }, [customSettingsService]);

  const closeLookup = useCallback(() => {
    setLookupState(INITIAL_LOOKUP_STATE);
    contextSentenceRef.current = undefined;
  }, []);

  const executeLookup = useCallback(
    async (text: string, lang: string, contextSentence?: string) => {
      try {
        const res = await dictionaryService.lookupWord({ text, lang, contextSentence });
        setLookupState((prev) => (prev.word === text ? { ...prev, loading: false, isPendingTrigger: false, result: res } : prev));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Lookup failed';
        setLookupState((prev) => (prev.word === text ? { ...prev, loading: false, isPendingTrigger: false, error: message } : prev));
      }
    },
    [dictionaryService]
  );

  const triggerLookup = useCallback(async () => {
    if (!lookupState.isOpen || !lookupState.word) return;
    setLookupState((prev) => ({ ...prev, loading: true, isPendingTrigger: false, error: null }));
    await executeLookup(lookupState.word, lookupState.lang, contextSentenceRef.current);
  }, [lookupState.isOpen, lookupState.word, lookupState.lang, executeLookup]);

  const handleSelectionLookup = useCallback(
    async (lang: string, contextSentence?: string) => {
      const extracted = extractSelectedTextAndCoords();
      if (!extracted) return;

      contextSentenceRef.current = contextSentence;
      const cached = dictionaryService.getCachedLookup
        ? await dictionaryService.getCachedLookup(lang, extracted.text)
        : null;

      if (cached) {
        setLookupState(createHitState(extracted.text, lang, extracted, cached));
      } else {
        setLookupState(createPendingState(extracted.text, lang, extracted));
      }
    },
    [dictionaryService]
  );

  useEffect(() => {
    if (!lookupState.isOpen || !lookupState.isPendingTrigger) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isMatchingHotkey(e, hotkey)) {
        e.preventDefault();
        triggerLookup();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lookupState.isOpen, lookupState.isPendingTrigger, hotkey, triggerLookup]);

  return {
    lookupState,
    handleSelectionLookup,
    triggerLookup,
    closeLookup,
    hotkeyLabel: getHotkeyDisplayLabel(hotkey),
  };
}
