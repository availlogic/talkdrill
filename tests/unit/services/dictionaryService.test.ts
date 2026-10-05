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
    dictionary: {
      hotkey: 'Alt',
      cacheTtlDays: 2,
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
    });

    it('treats expired cached entry as cache miss and deletes stale record', async () => {
      // 3 days old (expired since default cacheTtlDays is 2)
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      await db.wordLookups.add({
        text: 'viejo',
        lang: 'es-ES',
        translation: 'old',
        timestamp: threeDaysAgo,
      });

      mockGetSettings.mockResolvedValueOnce({
        ...defaultMockSettings,
        translation: {
          ...defaultMockSettings.translation,
          apiKey: '',
        },
      });

      const result = await service.lookupWord({ text: 'viejo', lang: 'es-ES' });
      expect(result.source).toBe('fallback');

      // Stale record should have been purged from DB
      const record = await db.wordLookups.where('[lang+text]').equals(['es-ES', 'viejo']).first();
      expect(record).toBeUndefined();
    });

    it('retains cached entry when cacheTtlDays is 0 or negative (indefinite retention)', async () => {
      const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
      await db.wordLookups.add({
        text: 'siempre',
        lang: 'es-ES',
        translation: 'always',
        timestamp: tenDaysAgo,
      });

      mockGetSettings.mockResolvedValueOnce({
        ...defaultMockSettings,
        dictionary: {
          hotkey: 'Alt',
          cacheTtlDays: 0,
        },
      });

      const result = await service.lookupWord({ text: 'siempre', lang: 'es-ES' });
      expect(result.source).toBe('cache');
      expect(result.translation).toBe('always');
    });

    it('getCachedLookup returns valid result or null if missing or expired', async () => {
      await db.wordLookups.add({
        text: 'valido',
        lang: 'es-ES',
        translation: 'valid',
        timestamp: Date.now(),
      });
      await db.wordLookups.add({
        text: 'caducado',
        lang: 'es-ES',
        translation: 'expired',
        timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
      });

      const hit = await service.getCachedLookup('es-ES', 'valido');
      expect(hit?.translation).toBe('valid');
      expect(hit?.source).toBe('cache');

      const miss = await service.getCachedLookup('es-ES', 'caducado');
      expect(miss).toBeNull();

      const nonExistent = await service.getCachedLookup('es-ES', 'inexistente');
      expect(nonExistent).toBeNull();
    });

    it('getCachedLookup returns null for empty or whitespace text', async () => {
      expect(await service.getCachedLookup('es-ES', '   ')).toBeNull();
      expect(await service.getCachedLookup('es-ES', '')).toBeNull();
    });

    it('getCachedLookup respects explicit ttlDays argument over settings', async () => {
      const threeDaysAgo = Date.now() - 3 * 86_400_000;
      await db.wordLookups.add({
        text: 'customttl',
        lang: 'es-ES',
        translation: 'custom ttl hit',
        timestamp: threeDaysAgo,
      });

      const hit = await service.getCachedLookup('es-ES', 'customttl', 4);
      expect(hit?.translation).toBe('custom ttl hit');

      const miss = await service.getCachedLookup('es-ES', 'customttl', 2);
      expect(miss).toBeNull();
    });

    it('getCachedLookup falls back to default 2 days when dictionary settings are missing', async () => {
      const threeDaysAgo = Date.now() - 3 * 86_400_000;
      const oneDayAgo = Date.now() - 1 * 86_400_000;
      await db.wordLookups.add({
        text: 'onedom',
        lang: 'es-ES',
        translation: 'one day',
        timestamp: oneDayAgo,
      });
      await db.wordLookups.add({
        text: 'threedom',
        lang: 'es-ES',
        translation: 'three days',
        timestamp: threeDaysAgo,
      });

      mockGetSettings.mockResolvedValueOnce({
        ...defaultMockSettings,
        dictionary: undefined,
      } as unknown as AppSettings);

      const hit = await service.getCachedLookup('es-ES', 'onedom');
      expect(hit?.translation).toBe('one day');

      mockGetSettings.mockResolvedValueOnce({
        ...defaultMockSettings,
        dictionary: undefined,
      } as unknown as AppSettings);

      const miss = await service.getCachedLookup('es-ES', 'threedom');
      expect(miss).toBeNull();
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

  describe('purgeExpiredLookups', () => {
    it('deletes entries older than ttl cutoff and returns deleted count', async () => {
      const now = Date.now();
      const freshTime = now - 1 * 24 * 60 * 60 * 1000; // 1 day old
      const expiredTime = now - 4 * 24 * 60 * 60 * 1000; // 4 days old

      await db.wordLookups.add({
        text: 'fresh',
        lang: 'en',
        translation: 'fresh word',
        timestamp: freshTime,
      });
      await db.wordLookups.add({
        text: 'stale',
        lang: 'en',
        translation: 'stale word',
        timestamp: expiredTime,
      });

      const deletedCount = await service.purgeExpiredLookups(2);
      expect(deletedCount).toBe(1);
      expect(await db.wordLookups.count()).toBe(1);

      const remaining = await db.wordLookups.toCollection().first();
      expect(remaining?.text).toBe('fresh');
    });

    it('does not delete any entries if ttlDays is 0 or negative', async () => {
      await db.wordLookups.add({
        text: 'ancient',
        lang: 'en',
        translation: 'ancient',
        timestamp: Date.now() - 365 * 24 * 60 * 60 * 1000,
      });

      const deletedCount = await service.purgeExpiredLookups(0);
      expect(deletedCount).toBe(0);

      const deletedNegative = await service.purgeExpiredLookups(-1);
      expect(deletedNegative).toBe(0);
      expect(await db.wordLookups.count()).toBe(1);
    });

    it('uses configured cacheTtlDays from settings when ttlDays parameter is omitted', async () => {
      const now = Date.now();
      const threeDaysAgo = now - 3 * 86_400_000;
      const fiveDaysAgo = now - 5 * 86_400_000;

      await db.wordLookups.add({
        text: 'three',
        lang: 'en',
        translation: 'three',
        timestamp: threeDaysAgo,
      });
      await db.wordLookups.add({
        text: 'five',
        lang: 'en',
        translation: 'five',
        timestamp: fiveDaysAgo,
      });

      mockGetSettings.mockResolvedValueOnce({
        ...defaultMockSettings,
        dictionary: {
          hotkey: 'Alt',
          cacheTtlDays: 4,
        },
      });

      const deletedCount = await service.purgeExpiredLookups();
      expect(deletedCount).toBe(1);
      expect(await db.wordLookups.count()).toBe(1);
      const remaining = await db.wordLookups.where('[lang+text]').equals(['en', 'three']).first();
      expect(remaining).toBeDefined();
    });

    it('falls back to default 2 days when ttlDays is omitted and settings dictionary is undefined', async () => {
      const now = Date.now();
      const oneDayAgo = now - 1 * 86_400_000;
      const threeDaysAgo = now - 3 * 86_400_000;

      await db.wordLookups.add({
        text: 'one',
        lang: 'en',
        translation: 'one',
        timestamp: oneDayAgo,
      });
      await db.wordLookups.add({
        text: 'three_fallback',
        lang: 'en',
        translation: 'three',
        timestamp: threeDaysAgo,
      });

      mockGetSettings.mockResolvedValueOnce({
        ...defaultMockSettings,
        dictionary: undefined,
      } as unknown as AppSettings);

      const deletedCount = await service.purgeExpiredLookups();
      expect(deletedCount).toBe(1);
      const remaining = await db.wordLookups.where('[lang+text]').equals(['en', 'one']).first();
      expect(remaining).toBeDefined();
    });
  });

});
