import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../../../src/storage/db';
import {
  DictionaryService,
  normalizeLookupText,
  parseDictionaryResponse,
  buildDictionaryUserPrompt,
  buildDictionaryPayload,
} from '../../../src/services/dictionaryService';
import type { AppSettings } from '../../../src/types/models';

describe('DictionaryService (TDD)', () => {
  let service: DictionaryService;
  let mockGetSettings: ReturnType<typeof vi.fn>;

  const defaultMockSettings: AppSettings = {
    theme: 'system',
    translation: {
      enabled: true,
      baseUrl: 'https://api.anthropic.com/v1',
      apiKey: 'sk-ant-test-key',
      model: 'claude-3-5-sonnet-20241022',
      useProxy: false,
    },
    tts: {
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      modelOrVoiceId: 'alloy',
    },
    printOptions: {
      defaultTallyBoxes: 100,
    },
  };

  beforeEach(async () => {
    await db.wordLookups.clear();
    mockGetSettings = vi.fn().mockResolvedValue(defaultMockSettings);
    const mockSettingsService = {
      getSettings: mockGetSettings,
      updateSettings: vi.fn(),
      resetSettings: vi.fn(),
    };
    service = new DictionaryService(mockSettingsService as never);
  });

  describe('normalizeLookupText', () => {
    it('trims whitespace and strips surrounding punctuation', () => {
      expect(normalizeLookupText('  "¿hola?"  ')).toBe('hola');
      expect(normalizeLookupText('«perdone»,')).toBe('perdone');
      expect(normalizeLookupText('¡Buenos días! ')).toBe('Buenos días');
    });

    it('retains apostrophes in contractions or clitics', () => {
      expect(normalizeLookupText("c'est-à-dire.")).toBe("c'est-à-dire");
    });
  });

  describe('buildDictionaryPayload', () => {
    it('constructs correct payload object for Anthropic messages API', () => {
      const payload = buildDictionaryPayload('custom-model-v1', 'Target Language: es-ES\nText: hola');
      expect(payload.model).toBe('custom-model-v1');
      expect(payload.max_tokens).toBe(512);
      expect(payload.system).toContain('expert bilingual lexicographer');
      expect(payload.messages).toEqual([{ role: 'user', content: 'Target Language: es-ES\nText: hola' }]);
    });
  });

  describe('buildDictionaryUserPrompt', () => {
    it('builds prompt without context when no context is provided', () => {
      const prompt = buildDictionaryUserPrompt('es-ES', 'perdone');
      expect(prompt).toContain('Target Language: es-ES');
      expect(prompt).toContain('Text: perdone');
      expect(prompt).not.toContain('Context Sentence:');
    });

    it('builds prompt without context when context is empty whitespace', () => {
      const prompt = buildDictionaryUserPrompt('es-ES', 'perdone', '   ');
      expect(prompt).toContain('Target Language: es-ES');
      expect(prompt).toContain('Text: perdone');
      expect(prompt).not.toContain('Context Sentence:');
    });

    it('builds prompt with context sentence when provided', () => {
      const prompt = buildDictionaryUserPrompt('es-ES', 'cobras', '¿Nos cobras la cuenta?');
      expect(prompt).toContain('Target Language: es-ES');
      expect(prompt).toContain('Text: cobras');
      expect(prompt).toContain('Context Sentence: ¿Nos cobras la cuenta?');
    });
  });

  describe('parseDictionaryResponse', () => {
    it('parses valid json string directly', () => {
      const raw = JSON.stringify({
        ipa: '/peɾˈdone/',
        partOfSpeech: 'verb / interjection',
        translation: 'excuse me / pardon',
        contextNote: 'Polite formal imperative of perdonar',
      });
      const parsed = parseDictionaryResponse(raw);
      expect(parsed.ipa).toBe('/peɾˈdone/');
      expect(parsed.partOfSpeech).toBe('verb / interjection');
      expect(parsed.translation).toBe('excuse me / pardon');
      expect(parsed.contextNote).toBe('Polite formal imperative of perdonar');
    });

    it('trims whitespace inside string fields', () => {
      const raw = JSON.stringify({
        ipa: '  /peɾˈdone/  ',
        partOfSpeech: '  verb  ',
        translation: '  excuse me  ',
        contextNote: '  note  ',
      });
      const parsed = parseDictionaryResponse(raw);
      expect(parsed.ipa).toBe('/peɾˈdone/');
      expect(parsed.partOfSpeech).toBe('verb');
      expect(parsed.translation).toBe('excuse me');
      expect(parsed.contextNote).toBe('note');
    });

    it('parses valid json with optional fields omitted or null', () => {
      const raw = JSON.stringify({
        translation: 'hello',
        ipa: null,
        partOfSpeech: 123,
      });
      const parsed = parseDictionaryResponse(raw);
      expect(parsed.translation).toBe('hello');
      expect(parsed.ipa).toBeUndefined();
      expect(parsed.partOfSpeech).toBeUndefined();
      expect(parsed.contextNote).toBeUndefined();
    });

    it('parses markdown-fenced json string', () => {
      const raw = '```json\n{"ipa": "/o.la/", "translation": "hello"}\n```';
      const parsed = parseDictionaryResponse(raw);
      expect(parsed.ipa).toBe('/o.la/');
      expect(parsed.translation).toBe('hello');
    });

    it('throws error when JSON translation is missing or empty', () => {
      const raw = JSON.stringify({ ipa: '/test/' });
      expect(() => parseDictionaryResponse(raw)).toThrow('Invalid dictionary response format');

      const rawEmpty = JSON.stringify({ translation: '   ' });
      expect(() => parseDictionaryResponse(rawEmpty)).toThrow('Invalid dictionary response format');
    });
  });


  describe('lookupWord', () => {
    it('throws an error if normalized text is empty', async () => {
      await expect(service.lookupWord({ text: '  ?!  ', lang: 'es-ES' })).rejects.toThrow(
        'Word or phrase cannot be empty'
      );
    });

    it('returns cached result from IndexedDB when available without calling API', async () => {
      await db.wordLookups.add({
        text: 'perdone',
        lang: 'es-ES',
        ipa: '/peɾˈdone/',
        partOfSpeech: 'interjection',
        translation: 'excuse me',
        contextNote: 'Formal polite',
        timestamp: Date.now(),
      });

      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      const result = await service.lookupWord({ text: '«perdone»', lang: 'es-ES' });
      expect(result).toEqual({
        text: 'perdone',
        lang: 'es-ES',
        ipa: '/peɾˈdone/',
        partOfSpeech: 'interjection',
        translation: 'excuse me',
        contextNote: 'Formal polite',
        source: 'cache',
      });
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(mockGetSettings).not.toHaveBeenCalled();
    });

    it('returns fallback result when translation API key is not configured or whitespace', async () => {
      mockGetSettings.mockResolvedValueOnce({
        ...defaultMockSettings,
        translation: {
          ...defaultMockSettings.translation,
          apiKey: '   ',
        },
      });

      const result = await service.lookupWord({ text: 'gracias', lang: 'es-ES' });
      expect(result.source).toBe('fallback');
      expect(result.text).toBe('gracias');
      expect(result.lang).toBe('es-ES');
      expect(result.translation).toContain('Configure Anthropic API Key in Settings');
    });

    it('fetches definition from Anthropic API and caches to IndexedDB', async () => {
      const mockApiResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ipa: '/ˈɡɾa.sjas/',
              partOfSpeech: 'interjection',
              translation: 'thank you / thanks',
              contextNote: 'Standard polite gratitude expression',
            }),
          },
        ],
        model: 'claude-3-5-sonnet-20241022',
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });
      globalThis.fetch = mockFetch;

      const result = await service.lookupWord({
        text: 'gracias',
        lang: 'es-ES',
        contextSentence: 'Muchas gracias por la comida.',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'sk-ant-test-key',
          }),
        })
      );
      expect(result.source).toBe('api');
      expect(result.text).toBe('gracias');
      expect(result.ipa).toBe('/ˈɡɾa.sjas/');
      expect(result.partOfSpeech).toBe('interjection');
      expect(result.contextNote).toBe('Standard polite gratitude expression');
      expect(result.translation).toBe('thank you / thanks');

      // Check that it was saved into IndexedDB
      const cachedRecord = await db.wordLookups
        .where('[lang+text]')
        .equals(['es-ES', 'gracias'])
        .first();
      expect(cachedRecord).toBeDefined();
      expect(cachedRecord?.translation).toBe('thank you / thanks');
      expect(cachedRecord?.ipa).toBe('/ˈɡɾa.sjas/');
      expect(cachedRecord?.partOfSpeech).toBe('interjection');
      expect(cachedRecord?.contextNote).toBe('Standard polite gratitude expression');
      expect(cachedRecord?.timestamp).toBeGreaterThan(0);
    });


    it('handles HTTP error from API by throwing a descriptive error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });
      globalThis.fetch = mockFetch;

      await expect(
        service.lookupWord({
          text: 'hola',
          lang: 'es-ES',
        })
      ).rejects.toThrow('Dictionary API error: HTTP 401');
    });

    it('returns fallback result when apiKey is undefined', async () => {
      mockGetSettings.mockResolvedValueOnce({
        ...defaultMockSettings,
        translation: {
          ...defaultMockSettings.translation,
          apiKey: undefined as unknown as string,
        },
      });

      const result = await service.lookupWord({ text: 'gracias', lang: 'es-ES' });
      expect(result.source).toBe('fallback');
      expect(result.translation).toContain('Configure Anthropic API Key in Settings');
    });

    it('uses custom trimmed model from settings when fetching from API', async () => {
      mockGetSettings.mockResolvedValueOnce({
        ...defaultMockSettings,
        translation: {
          ...defaultMockSettings.translation,
          model: '  custom-claude-3-haiku  ',
        },
      });
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: JSON.stringify({ translation: 'bonjour' }) }],
        }),
      });
      globalThis.fetch = mockFetch;
      await service.lookupWord({ text: 'bonjour', lang: 'fr-FR' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"model":"custom-claude-3-haiku"'),
        })
      );
    });

    it('falls back to default claude-3-5-sonnet-20241022 when model in settings is empty', async () => {
      mockGetSettings.mockResolvedValueOnce({
        ...defaultMockSettings,
        translation: {
          ...defaultMockSettings.translation,
          model: '   ',
        },
      });
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: JSON.stringify({ translation: 'test' }) }],
        }),
      });
      globalThis.fetch = mockFetch;
      await service.lookupWord({ text: 'test', lang: 'en' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"model":"claude-3-5-sonnet-20241022"'),
        })
      );
    });

    it('throws error when API returns empty content or invalid structure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [],
        }),
      });
      globalThis.fetch = mockFetch;
      await expect(service.lookupWord({ text: 'test', lang: 'en' })).rejects.toThrow();
    });
  });


  describe('clearCache', () => {
    it('clears all cached entries in IndexedDB', async () => {
      await db.wordLookups.add({
        text: 'hola',
        lang: 'es-ES',
        translation: 'hello',
        timestamp: Date.now(),
      });
      expect(await db.wordLookups.count()).toBe(1);

      await service.clearCache();
      expect(await db.wordLookups.count()).toBe(0);
    });
  });
});
