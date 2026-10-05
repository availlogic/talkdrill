import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWordLookup, extractSelectedTextAndCoords, INITIAL_LOOKUP_STATE } from '../../../src/hooks/useWordLookup';
import type { DictionaryService } from '../../../src/services/dictionaryService';
import type { WordLookupResult } from '../../../src/types/models';

describe('useWordLookup hook (TDD)', () => {
  let mockLookupWord: ReturnType<typeof vi.fn>;
  let mockDictionaryService: DictionaryService;

  beforeEach(() => {
    mockLookupWord = vi.fn();
    mockDictionaryService = {
      lookupWord: mockLookupWord,
      clearCache: vi.fn(),
    } as unknown as DictionaryService;
  });

  describe('extractSelectedTextAndCoords', () => {
    it('returns null when window.getSelection returns null', () => {
      vi.spyOn(window, 'getSelection').mockReturnValue(null);
      expect(extractSelectedTextAndCoords()).toBeNull();
    });

    it('returns null when selection rangeCount is 0', () => {
      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 0,
        isCollapsed: false,
        toString: () => 'hello',
      } as unknown as Selection);
      expect(extractSelectedTextAndCoords()).toBeNull();
    });

    it('returns null when selection is collapsed', () => {
      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 1,
        isCollapsed: true,
        toString: () => 'hello',
      } as unknown as Selection);
      expect(extractSelectedTextAndCoords()).toBeNull();
    });

    it('returns null when selected text is whitespace only', () => {
      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 1,
        isCollapsed: false,
        toString: () => '   ',
      } as unknown as Selection);
      expect(extractSelectedTextAndCoords()).toBeNull();
    });

    it('extracts text and coordinates from valid selection', () => {
      const mockRange = {
        getBoundingClientRect: () => ({
          left: 150,
          bottom: 250,
        }),
      };
      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 1,
        isCollapsed: false,
        toString: () => '  perdone  ',
        getRangeAt: () => mockRange,
      } as unknown as Selection);

      const result = extractSelectedTextAndCoords();
      expect(result).toEqual({
        text: 'perdone',
        x: 150,
        y: 250,
      });
    });
  });

  describe('useWordLookup state transitions', () => {
    it('initializes with exact INITIAL_LOOKUP_STATE', () => {
      const { result } = renderHook(() => useWordLookup(mockDictionaryService));
      expect(result.current.lookupState).toEqual(INITIAL_LOOKUP_STATE);
      expect(result.current.lookupState.lang).toBe('');
      expect(result.current.lookupState.isOpen).toBe(false);
      expect(result.current.lookupState.word).toBe('');
      expect(result.current.lookupState.loading).toBe(false);
    });

    it('does nothing when handleSelectionLookup is called without active selection', async () => {
      vi.spyOn(window, 'getSelection').mockReturnValue(null);
      const { result } = renderHook(() => useWordLookup(mockDictionaryService));

      await act(async () => {
        await result.current.handleSelectionLookup('es-ES');
      });

      expect(mockLookupWord).not.toHaveBeenCalled();
      expect(result.current.lookupState.isOpen).toBe(false);
    });

    it('sets loading true immediately then updates with result upon resolution', async () => {
      let resolvePromise: (val: WordLookupResult) => void = () => {};
      const pendingPromise = new Promise<WordLookupResult>((resolve) => {
        resolvePromise = resolve;
      });
      mockLookupWord.mockReturnValue(pendingPromise);

      const mockRange = {
        getBoundingClientRect: () => ({ left: 200, bottom: 300 }),
      };
      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 1,
        isCollapsed: false,
        toString: () => 'perdone',
        getRangeAt: () => mockRange,
      } as unknown as Selection);

      const { result } = renderHook(() => useWordLookup(mockDictionaryService));

      let lookupCallPromise: Promise<void>;
      act(() => {
        lookupCallPromise = result.current.handleSelectionLookup('es-ES', 'Context sentence');
      });

      // Verify loading state is true before resolution
      expect(result.current.lookupState.isOpen).toBe(true);
      expect(result.current.lookupState.loading).toBe(true);
      expect(result.current.lookupState.word).toBe('perdone');
      expect(result.current.lookupState.lang).toBe('es-ES');
      expect(result.current.lookupState.x).toBe(200);
      expect(result.current.lookupState.y).toBe(300);

      const mockResult: WordLookupResult = {
        text: 'perdone',
        lang: 'es-ES',
        ipa: '/peɾˈdone/',
        translation: 'excuse me',
        source: 'api',
      };

      await act(async () => {
        resolvePromise(mockResult);
        await lookupCallPromise!;
      });

      expect(result.current.lookupState.loading).toBe(false);
      expect(result.current.lookupState.result).toEqual(mockResult);
      expect(result.current.lookupState.error).toBeNull();
    });

    it('sets error in state when lookup fails with Error instance', async () => {
      mockLookupWord.mockRejectedValue(new Error('Network error'));

      const mockRange = {
        getBoundingClientRect: () => ({ left: 200, bottom: 300 }),
      };
      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 1,
        isCollapsed: false,
        toString: () => 'error-word',
        getRangeAt: () => mockRange,
      } as unknown as Selection);

      const { result } = renderHook(() => useWordLookup(mockDictionaryService));

      await act(async () => {
        await result.current.handleSelectionLookup('es-ES');
      });

      expect(result.current.lookupState.isOpen).toBe(true);
      expect(result.current.lookupState.loading).toBe(false);
      expect(result.current.lookupState.error).toBe('Network error');
    });

    it('sets generic error when lookup fails with non-Error rejection', async () => {
      mockLookupWord.mockRejectedValue('Internal server crash');

      const mockRange = {
        getBoundingClientRect: () => ({ left: 200, bottom: 300 }),
      };
      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 1,
        isCollapsed: false,
        toString: () => 'non-error-word',
        getRangeAt: () => mockRange,
      } as unknown as Selection);

      const { result } = renderHook(() => useWordLookup(mockDictionaryService));

      await act(async () => {
        await result.current.handleSelectionLookup('es-ES');
      });

      expect(result.current.lookupState.isOpen).toBe(true);
      expect(result.current.lookupState.loading).toBe(false);
      expect(result.current.lookupState.error).toBe('Lookup failed');
    });

    it('closes lookup state when closeLookup is called', () => {
      const { result } = renderHook(() => useWordLookup(mockDictionaryService));

      act(() => {
        result.current.closeLookup();
      });

      expect(result.current.lookupState).toEqual(INITIAL_LOOKUP_STATE);
    });
  });
});
