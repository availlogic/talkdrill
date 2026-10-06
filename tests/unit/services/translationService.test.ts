import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TranslationService } from '../../../src/services/translationService';

describe('TranslationService (TDD)', () => {
  let service: TranslationService;

  beforeEach(() => {
    service = new TranslationService();
  });

  it('builds spoken prompt for all supported default languages', () => {
    const promptEs = service.buildSpokenPrompt('es-ES');
    expect(promptEs).toContain('Castilian Spanish');
    expect(promptEs).toContain('Preserve the exact line break and paragraph structure');

    const promptJa = service.buildSpokenPrompt('ja-JP');
    expect(promptJa).toContain('Japanese');
    expect(promptJa).toContain('Preserve the exact line break and paragraph structure');

    const promptFr = service.buildSpokenPrompt('fr-FR');
    expect(promptFr).toContain('French');
    expect(promptFr).toContain('Preserve the exact line break and paragraph structure');

    const promptDe = service.buildSpokenPrompt('de-DE');
    expect(promptDe).toContain('German');
    expect(promptDe).toContain('Preserve the exact line break and paragraph structure');

    const promptEn = service.buildSpokenPrompt('en-US');
    expect(promptEn).toContain('American English');
    expect(promptEn).toContain('Preserve the exact line break and paragraph structure');

    const promptOther = service.buildSpokenPrompt('it-IT');
    expect(promptOther).toContain('expert native translator');
    expect(promptOther).toContain('Preserve the exact line break and paragraph structure');
  });

  it('allows legacy custom prompt override', () => {
    const prompt = service.buildSpokenPrompt('es-ES', 'Custom dialect instructions');
    expect(prompt).toBe('Custom dialect instructions');
  });

  it('respects per-language customPrompts with highest priority', () => {
    const prompt = service.buildSpokenPrompt('es-ES', 'Legacy fallback', {
      'es-ES': 'Mexican Spanish custom instructions',
      default: 'Universal custom',
    });
    expect(prompt).toBe('Mexican Spanish custom instructions');
  });

  it('falls back to customPrompts.default when specific language is not configured', () => {
    const prompt = service.buildSpokenPrompt('it-IT', undefined, {
      default: 'Universal custom for all languages',
    });
    expect(prompt).toBe('Universal custom for all languages');
  });

  it('ignores empty whitespace custom prompts and falls back to system defaults', () => {
    const prompt = service.buildSpokenPrompt('de-DE', '   ', {
      'de-DE': '   ',
      default: '   ',
    });
    expect(prompt).toContain('German');
  });

  it('covers various combinations of fallback in buildSpokenPrompt', () => {
    expect(service.buildSpokenPrompt('es-ES', 'Legacy', {})).toBe('Legacy');
    expect(service.buildSpokenPrompt('es-ES', '   ', { default: 'Universal' })).toBe('Universal');
    expect(service.buildSpokenPrompt('ja-JP', '', {})).toContain('conversational Japanese');
    expect(service.buildSpokenPrompt('unknown-lang', undefined, undefined)).toContain('expert native translator');
    expect(service.buildSpokenPrompt('default')).toContain('expert native translator');
  });

  it('throws error when API Key is missing', async () => {
    await expect(
      service.translate({
        sourceText: 'Hello',
        sourceLang: 'en',
        targetLang: 'es-ES',
        apiKey: '',
      })
    ).rejects.toThrow('Translation API Key is missing');
  });

  it('parses Anthropic messages response successfully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: '¿Nos cobras, por favor?' }],
        model: 'claude-3-5-sonnet-20241022',
        usage: { input_tokens: 10, output_tokens: 8 },
      }),
    });

    globalThis.fetch = mockFetch;

    const res = await service.translate({
      sourceText: 'Could we have the bill, please?',
      sourceLang: 'en',
      targetLang: 'es-ES',
      apiKey: 'sk-ant-test',
      baseUrl: 'https://api.anthropic.com/v1',
    });

    expect(res.translatedText).toBe('¿Nos cobras, por favor?');
    expect(res.modelUsed).toBe('claude-3-5-sonnet-20241022');
    expect(res.inputTokens).toBe(10);
    expect(res.outputTokens).toBe(8);
  });

  it('passes customPrompts through to system prompt when translating', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Bonjour' }],
        model: 'claude-3-5-sonnet-20241022',
        usage: { input_tokens: 5, output_tokens: 3 },
      }),
    });
    globalThis.fetch = mockFetch;

    await service.translate({
      sourceText: 'Hello',
      sourceLang: 'en',
      targetLang: 'fr-FR',
      apiKey: 'sk-ant-test',
      baseUrl: 'https://api.anthropic.com/v1',
      useProxy: false,
      customPrompts: {
        'fr-FR': 'Custom French instructions',
      },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        body: expect.stringContaining('Custom French instructions'),
      })
    );
  });

  it('trims whitespace and handles missing model and missing usage fields gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: '   ¡Hola!   ' }],
      }),
    });
    globalThis.fetch = mockFetch;

    const res = await service.translate({
      sourceText: 'Hello',
      sourceLang: 'en',
      targetLang: 'es-ES',
      apiKey: 'test-key',
      model: 'my-custom-fallback-model',
    });

    expect(res.translatedText).toBe('¡Hola!');
    expect(res.modelUsed).toBe('my-custom-fallback-model');
    expect(res.inputTokens).toBe(0);
    expect(res.outputTokens).toBe(0);
  });

  it('handles empty content or empty text gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [],
      }),
    });
    globalThis.fetch = mockFetch;

    const res = await service.translate({
      sourceText: 'Hello',
      sourceLang: 'en',
      targetLang: 'es-ES',
      apiKey: 'test-key',
    });

    expect(res.translatedText).toBe('');
  });

  it('throws error when translation API returns not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    await expect(
      service.translate({
        sourceText: 'test',
        sourceLang: 'en',
        targetLang: 'es-ES',
        apiKey: 'bad-key',
      })
    ).rejects.toThrow('Translation API error: HTTP 401');
  });

  it('correctly dispatches requests to third-party Anthropic-compatible endpoint without duplicating messages path', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Hola mundo' }],
        model: 'MiniMax-M3',
        usage: { input_tokens: 5, output_tokens: 5 },
      }),
    });
    globalThis.fetch = mockFetch;

    await service.translate({
      sourceText: 'Hello world',
      sourceLang: 'en',
      targetLang: 'es-ES',
      apiKey: 'test-key',
      baseUrl: 'https://api.minimaxi.com/anthropic/v1/messages',
      model: 'MiniMax-M3',
      useProxy: false,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.minimaxi.com/anthropic/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.not.objectContaining({ 'anthropic-version': expect.anything() }),
      })
    );
  });

  it('includes anthropic-version header when targeting official Anthropic endpoint directly with useProxy: false', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Anthropic Hello' }],
        model: 'claude-3-5-sonnet-20241022',
      }),
    });
    globalThis.fetch = mockFetch;

    await service.translate({
      sourceText: 'Hello',
      sourceLang: 'en',
      targetLang: 'es-ES',
      apiKey: 'sk-ant-test',
      baseUrl: 'https://api.anthropic.com/v1',
      useProxy: false,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        headers: expect.objectContaining({
          'anthropic-version': '2023-06-01',
          'x-api-key': 'sk-ant-test',
        }),
      })
    );
  });

  it('defaults to same-origin proxy /api/proxy/anthropic when useProxy is omitted for external URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Auto Proxied Hello' }],
        model: 'MiniMax-M3',
      }),
    });
    globalThis.fetch = mockFetch;

    await service.translate({
      sourceText: 'Hello',
      sourceLang: 'en',
      targetLang: 'es-ES',
      apiKey: 'minimax-key',
      baseUrl: 'https://api.minimax.cn/anthropic/v1/messages',
      model: 'MiniMax-M3',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/proxy/anthropic',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'minimax-key',
          'x-target-endpoint': 'https://api.minimax.cn/anthropic/v1/messages',
        }),
      })
    );
  });

  it('routes request through same-origin /api/proxy/anthropic with x-target-endpoint when useProxy is true', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Proxied Hello' }],
        model: 'MiniMax-M3',
      }),
    });
    globalThis.fetch = mockFetch;

    await service.translate({
      sourceText: 'Hello',
      sourceLang: 'en',
      targetLang: 'es-ES',
      apiKey: 'minimax-key',
      baseUrl: 'https://api.minimax.cn/anthropic/v1/messages',
      model: 'MiniMax-M3',
      useProxy: true,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/proxy/anthropic',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'minimax-key',
          'x-target-endpoint': 'https://api.minimax.cn/anthropic/v1/messages',
        }),
      })
    );
  });

  it('routes request directly to /api/proxy/anthropic when baseUrl is already set to proxy path', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Direct Proxy Hello' }],
        model: 'claude-3-5-sonnet-20241022',
      }),
    });
    globalThis.fetch = mockFetch;

    await service.translate({
      sourceText: 'Hello',
      sourceLang: 'en',
      targetLang: 'es-ES',
      apiKey: 'any-key',
      baseUrl: '/api/proxy/anthropic',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/proxy/anthropic',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'any-key',
        }),
      })
    );
  });

  it('includes anthropic-version header when routing official Anthropic through proxy', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Proxied Anthropic Hello' }],
        model: 'claude-3-5-sonnet-20241022',
      }),
    });
    globalThis.fetch = mockFetch;

    await service.translate({
      sourceText: 'Hello',
      sourceLang: 'en',
      targetLang: 'es-ES',
      apiKey: 'sk-ant-test',
      baseUrl: 'https://api.anthropic.com/v1',
      useProxy: true,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/proxy/anthropic',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'sk-ant-test',
          'x-target-endpoint': 'https://api.anthropic.com/v1/messages',
          'anthropic-version': '2023-06-01',
        }),
      })
    );
  });
});
