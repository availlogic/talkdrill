import { useState, useCallback } from 'react';
import { DictionaryService } from '../services/dictionaryService';
import type { WordLookupResult } from '../types/models';

export interface WordLookupState {
  isOpen: boolean;
  word: string;
  lang: string;
  x: number;
  y: number;
  loading: boolean;
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

export function useWordLookup(dictionaryService = new DictionaryService()) {
  const [lookupState, setLookupState] = useState<WordLookupState>(INITIAL_LOOKUP_STATE);

  const closeLookup = useCallback(() => {
    setLookupState(INITIAL_LOOKUP_STATE);
  }, []);

  const executeLookup = useCallback(
    async (text: string, lang: string, contextSentence?: string) => {
      try {
        const res = await dictionaryService.lookupWord({ text, lang, contextSentence });
        setLookupState((prev) => (prev.word === text ? { ...prev, loading: false, result: res } : prev));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Lookup failed';
        setLookupState((prev) => (prev.word === text ? { ...prev, loading: false, error: message } : prev));
      }
    },
    [dictionaryService]
  );

  const handleSelectionLookup = useCallback(
    async (lang: string, contextSentence?: string) => {
      const extracted = extractSelectedTextAndCoords();
      if (!extracted) {
        return;
      }

      setLookupState({
        isOpen: true,
        word: extracted.text,
        lang,
        x: extracted.x,
        y: extracted.y,
        loading: true,
        result: null,
        error: null,
      });

      await executeLookup(extracted.text, lang, contextSentence);
    },
    [executeLookup]
  );

  return {
    lookupState,
    handleSelectionLookup,
    closeLookup,
  };
}
