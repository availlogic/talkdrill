import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TranslationService } from '../../../src/services/translationService';

describe('TranslationService (TDD)', () => {
  let service: TranslationService;

  beforeEach(() => {
    service = new TranslationService();
  });

  it('builds spoken prompt for Castilian Spanish and Japanese by default', () => {
    const promptEs = service.buildSpokenPrompt('es-ES');
    expect(promptEs).toContain('Castilian Spanish');

    const promptJa = service.buildSpokenPrompt('ja-JP');
    expect(promptJa).toContain('Japanese');

    const promptOther = service.buildSpokenPrompt('fr-FR');
    expect(promptOther).toContain('expert native translator');
  });

  it('allows custom prompt override', () => {
    const prompt = service.buildSpokenPrompt('es-ES', 'Custom dialect instructions');
    expect(prompt).toBe('Custom dialect instructions');
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
});
