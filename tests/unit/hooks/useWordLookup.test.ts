import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWordLookup, extractSelectedTextAndCoords, INITIAL_LOOKUP_STATE, type SettingsReader } from '../../../src/hooks/useWordLookup';
import type { DictionaryService } from '../../../src/services/dictionaryService';
import type { AppSettings, WordLookupResult } from '../../../src/types/models';

describe('useWordLookup hook (TDD)', () => {
  let mockLookupWord: ReturnType<typeof vi.fn>;
  let mockGetCachedLookup: ReturnType<typeof vi.fn>;
  let mockDictionaryService: DictionaryService;
  let mockSettingsService: SettingsReader;

  const defaultMockSettings: AppSettings = {
    translation: {
      enabled: true,
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'mock-key',
      model: 'gpt-4o',
    },
    tts: {
      provider: 'openai',
      baseUrl: '',
      apiKey: '',
      modelOrVoiceId: '',
    },
    printOptions: {
      defaultTallyBoxes: 60,
    },
    dictionary: {
      voiceURI: '',
      hotkey: 'Alt',
      cacheTtlDays: 2,
    },
  };

  beforeEach(() => {
    mockLookupWord = vi.fn();
    mockGetCachedLookup = vi.fn().mockResolvedValue(null);
    mockDictionaryService = {
      lookupWord: mockLookupWord,
      getCachedLookup: mockGetCachedLookup,
      clearCache: vi.fn(),
      purgeExpiredLookups: vi.fn(),
    } as unknown as DictionaryService;

    mockSettingsService = {
      getSettings: vi.fn().mockResolvedValue(defaultMockSettings),
    };
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
      const { result } = renderHook(() => useWordLookup(mockDictionaryService, mockSettingsService));
      expect(result.current.lookupState).toEqual(INITIAL_LOOKUP_STATE);
      expect(result.current.lookupState.lang).toBe('');
      expect(result.current.lookupState.isOpen).toBe(false);
      expect(result.current.lookupState.word).toBe('');
      expect(result.current.lookupState.loading).toBe(false);
      expect(result.current.lookupState.isPendingTrigger).toBe(false);
    });

    it('does nothing when handleSelectionLookup is called without active selection', async () => {
      vi.spyOn(window, 'getSelection').mockReturnValue(null);
      const { result } = renderHook(() => useWordLookup(mockDictionaryService, mockSettingsService));

      await act(async () => {
        await result.current.handleSelectionLookup('es-ES');
      });

      expect(mockLookupWord).not.toHaveBeenCalled();
      expect(result.current.lookupState.isOpen).toBe(false);
    });

    it('immediately sets cached result without pending trigger on cache hit', async () => {
      const cachedResult: WordLookupResult = {
        text: 'gracias',
        lang: 'es-ES',
        translation: 'thank you',
        source: 'cache',
      };
      mockGetCachedLookup.mockResolvedValue(cachedResult);

      const mockRange = {
        getBoundingClientRect: () => ({ left: 200, bottom: 300 }),
      };
      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 1,
        isCollapsed: false,
        toString: () => 'gracias',
        getRangeAt: () => mockRange,
      } as unknown as Selection);

      const { result } = renderHook(() => useWordLookup(mockDictionaryService, mockSettingsService));

      await act(async () => {
        await result.current.handleSelectionLookup('es-ES');
      });

      expect(result.current.lookupState.isOpen).toBe(true);
      expect(result.current.lookupState.isPendingTrigger).toBe(false);
      expect(result.current.lookupState.loading).toBe(false);
      expect(result.current.lookupState.result).toEqual(cachedResult);
      expect(mockLookupWord).not.toHaveBeenCalled();
    });

    it('sets isPendingTrigger to true on cache miss without triggering LLM query', async () => {
      mockGetCachedLookup.mockResolvedValue(null);

      const mockRange = {
        getBoundingClientRect: () => ({ left: 200, bottom: 300 }),
      };
      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 1,
        isCollapsed: false,
        toString: () => 'perdone',
        getRangeAt: () => mockRange,
      } as unknown as Selection);

      const { result } = renderHook(() => useWordLookup(mockDictionaryService, mockSettingsService));

      await act(async () => {
        await result.current.handleSelectionLookup('es-ES', 'Context sentence');
      });

      expect(result.current.lookupState.isOpen).toBe(true);
      expect(result.current.lookupState.isPendingTrigger).toBe(true);
      expect(result.current.lookupState.loading).toBe(false);
      expect(result.current.lookupState.result).toBeNull();
      expect(mockLookupWord).not.toHaveBeenCalled();
    });

    it('triggers LLM lookup when triggerLookup is called manually', async () => {
      mockGetCachedLookup.mockResolvedValue(null);
      const mockResult: WordLookupResult = {
        text: 'perdone',
        lang: 'es-ES',
        ipa: '/peɾˈdone/',
        translation: 'excuse me',
        source: 'api',
      };
      let resolveLookup: (val: WordLookupResult) => void = () => {};
      mockLookupWord.mockReturnValue(new Promise<WordLookupResult>((resolve) => {
        resolveLookup = resolve;
      }));

      const { result } = renderHook(() => useWordLookup(mockDictionaryService, mockSettingsService));

      await act(async () => {
        await result.current.handleSelectionLookup('es-ES', 'Context sentence');
      });

      expect(result.current.lookupState.isPendingTrigger).toBe(true);

      let triggerCallPromise: Promise<void>;
      act(() => {
        triggerCallPromise = result.current.triggerLookup();
      });

      expect(result.current.lookupState.loading).toBe(true);
      expect(result.current.lookupState.isPendingTrigger).toBe(false);

      await act(async () => {
        resolveLookup(mockResult);
        await triggerCallPromise!;
      });

      expect(mockLookupWord).toHaveBeenCalledWith({
        text: 'perdone',
        lang: 'es-ES',
        contextSentence: 'Context sentence',
      });
      expect(result.current.lookupState.loading).toBe(false);
      expect(result.current.lookupState.isPendingTrigger).toBe(false);
      expect(result.current.lookupState.result).toEqual(mockResult);
    });

    it('triggers LLM lookup when configured hotkey is pressed on keydown', async () => {
      mockGetCachedLookup.mockResolvedValue(null);
      const mockResult: WordLookupResult = {
        text: 'perdone',
        lang: 'es-ES',
        ipa: '/peɾˈdone/',
        translation: 'excuse me',
        source: 'api',
      };
      mockLookupWord.mockResolvedValue(mockResult);

      const mockRange = {
        getBoundingClientRect: () => ({ left: 200, bottom: 300 }),
      };
      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 1,
        isCollapsed: false,
        toString: () => 'perdone',
        getRangeAt: () => mockRange,
      } as unknown as Selection);

      const { result } = renderHook(() => useWordLookup(mockDictionaryService, mockSettingsService));

      await act(async () => {
        await result.current.handleSelectionLookup('es-ES');
      });

      expect(result.current.lookupState.isPendingTrigger).toBe(true);

      // Fire hotkey Alt event
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', code: 'AltLeft', repeat: false }));
      });

      expect(mockLookupWord).toHaveBeenCalledWith({
        text: 'perdone',
        lang: 'es-ES',
        contextSentence: undefined,
      });
      expect(result.current.lookupState.result).toEqual(mockResult);
    });

    it('does not trigger lookup when non-matching key is pressed', async () => {
      mockGetCachedLookup.mockResolvedValue(null);

      const mockRange = {
        getBoundingClientRect: () => ({ left: 200, bottom: 300 }),
      };
      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 1,
        isCollapsed: false,
        toString: () => 'perdone',
        getRangeAt: () => mockRange,
      } as unknown as Selection);

      const { result } = renderHook(() => useWordLookup(mockDictionaryService, mockSettingsService));

      await act(async () => {
        await result.current.handleSelectionLookup('es-ES');
      });

      expect(result.current.lookupState.isPendingTrigger).toBe(true);

      // Fire non-matching Enter event
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', repeat: false }));
      });

      expect(mockLookupWord).not.toHaveBeenCalled();
      expect(result.current.lookupState.isPendingTrigger).toBe(true);
    });

    it('sets error in state and clears pending trigger when lookup fails with Error instance', async () => {
      mockGetCachedLookup.mockResolvedValue(null);
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

      const { result } = renderHook(() => useWordLookup(mockDictionaryService, mockSettingsService));

      await act(async () => {
        await result.current.handleSelectionLookup('es-ES');
      });

      await act(async () => {
        await result.current.triggerLookup();
      });

      expect(result.current.lookupState.isOpen).toBe(true);
      expect(result.current.lookupState.loading).toBe(false);
      expect(result.current.lookupState.isPendingTrigger).toBe(false);
      expect(result.current.lookupState.error).toBe('Network error');
    });

    it('sets generic error and clears pending trigger when lookup fails with non-Error rejection', async () => {
      mockGetCachedLookup.mockResolvedValue(null);
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

      const { result } = renderHook(() => useWordLookup(mockDictionaryService, mockSettingsService));

      await act(async () => {
        await result.current.handleSelectionLookup('es-ES');
      });

      await act(async () => {
        await result.current.triggerLookup();
      });

      expect(result.current.lookupState.isOpen).toBe(true);
      expect(result.current.lookupState.loading).toBe(false);
      expect(result.current.lookupState.isPendingTrigger).toBe(false);
      expect(result.current.lookupState.error).toBe('Lookup failed');
    });

    it('does not trigger hotkey lookup if popover is already open with cached result and not pending', async () => {
      const cachedResult: WordLookupResult = {
        text: 'gracias',
        lang: 'es-ES',
        translation: 'thank you',
        source: 'cache',
      };
      mockGetCachedLookup.mockResolvedValue(cachedResult);
      const mockRange = {
        getBoundingClientRect: () => ({ left: 200, bottom: 300 }),
      };
      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 1,
        isCollapsed: false,
        toString: () => 'gracias',
        getRangeAt: () => mockRange,
      } as unknown as Selection);

      const { result } = renderHook(() => useWordLookup(mockDictionaryService, mockSettingsService));
      await act(async () => {
        await result.current.handleSelectionLookup('es-ES');
      });

      expect(result.current.lookupState.isPendingTrigger).toBe(false);

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', code: 'AltLeft' }));
      });

      expect(mockLookupWord).not.toHaveBeenCalled();
    });

    it('removes keydown listener when lookup is closed', async () => {
      mockGetCachedLookup.mockResolvedValue(null);
      const mockRange = {
        getBoundingClientRect: () => ({ left: 200, bottom: 300 }),
      };
      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 1,
        isCollapsed: false,
        toString: () => 'perdone',
        getRangeAt: () => mockRange,
      } as unknown as Selection);

      const { result } = renderHook(() => useWordLookup(mockDictionaryService, mockSettingsService));
      await act(async () => {
        await result.current.handleSelectionLookup('es-ES');
      });

      expect(result.current.lookupState.isPendingTrigger).toBe(true);

      act(() => {
        result.current.closeLookup();
      });

      // Press hotkey after close
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', code: 'AltLeft' }));
      });

      expect(mockLookupWord).not.toHaveBeenCalled();
    });

    it('closes lookup state when closeLookup is called', () => {
      const { result } = renderHook(() => useWordLookup(mockDictionaryService, mockSettingsService));

      act(() => {
        result.current.closeLookup();
      });

      expect(result.current.lookupState).toEqual(INITIAL_LOOKUP_STATE);
    });

    it('updates hotkey and hotkeyLabel when settings provide non-default hotkey', async () => {
      const customSettingsService: SettingsReader = {
        getSettings: vi.fn().mockResolvedValue({
          ...defaultMockSettings,
          dictionary: {
            hotkey: 'MetaLeft',
            cacheTtlDays: 7,
          },
        }),
      };
      const { result } = renderHook(() => useWordLookup(mockDictionaryService, customSettingsService));
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.hotkeyLabel).toBe('Left Command ⌘');
    });

    it('loads voiceURI from dictionary settings', async () => {
      const customSettingsService: SettingsReader = {
        getSettings: vi.fn().mockResolvedValue({
          ...defaultMockSettings,
          dictionary: {
            hotkey: 'Alt',
            cacheTtlDays: 2,
            voiceURI: 'es-voice-monica',
          },
        }),
      };
      const { result } = renderHook(() => useWordLookup(mockDictionaryService, customSettingsService));
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.voiceURI).toBe('es-voice-monica');
    });

    it('does nothing when triggerLookup is called while popover is closed or word is empty', async () => {
      const { result } = renderHook(() => useWordLookup(mockDictionaryService, mockSettingsService));
      await act(async () => {
        await result.current.triggerLookup();
      });
      expect(mockLookupWord).not.toHaveBeenCalled();
      expect(result.current.lookupState.loading).toBe(false);
    });

    it('calls preventDefault when matching hotkey is pressed on keydown', async () => {
      mockGetCachedLookup.mockResolvedValue(null);
      const mockRange = {
        getBoundingClientRect: () => ({ left: 200, bottom: 300 }),
      };
      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 1,
        isCollapsed: false,
        toString: () => 'perdone',
        getRangeAt: () => mockRange,
      } as unknown as Selection);

      const { result } = renderHook(() => useWordLookup(mockDictionaryService, mockSettingsService));
      await act(async () => {
        await result.current.handleSelectionLookup('es-ES');
      });

      const keyEvent = new KeyboardEvent('keydown', { key: 'Alt', code: 'AltLeft', cancelable: true });
      const preventDefaultSpy = vi.spyOn(keyEvent, 'preventDefault');

      await act(async () => {
        window.dispatchEvent(keyEvent);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('does not overwrite state if word in state changed before lookup resolved', async () => {
      let resolvePromise: (val: WordLookupResult) => void = () => {};
      mockLookupWord.mockReturnValue(new Promise<WordLookupResult>((resolve) => {
        resolvePromise = resolve;
      }));

      const mockRange = {
        getBoundingClientRect: () => ({ left: 200, bottom: 300 }),
      };
      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 1,
        isCollapsed: false,
        toString: () => 'wordA',
        getRangeAt: () => mockRange,
      } as unknown as Selection);

      const { result } = renderHook(() => useWordLookup(mockDictionaryService, mockSettingsService));
      await act(async () => {
        await result.current.handleSelectionLookup('es-ES');
      });
      let triggerPromise: Promise<void>;
      act(() => {
        triggerPromise = result.current.triggerLookup();
      });

      // Now close lookup
      act(() => {
        result.current.closeLookup();
      });

      // Resolve the delayed wordA lookup
      await act(async () => {
        resolvePromise({
          text: 'wordA',
          lang: 'es-ES',
          translation: 'translation A',
          source: 'api',
        });
        await triggerPromise!;
      });

      expect(result.current.lookupState).toEqual(INITIAL_LOOKUP_STATE);
    });
  });
});
