import { getAnthropicMessagesEndpoint } from '../utils/urlHelper';

export interface TranslateRequest {
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  apiKey: string;
  baseUrl?: string | undefined;
  model?: string | undefined;
  customPrompt?: string | undefined;
  useProxy?: boolean | undefined;
}

export interface TranslateResponse {
  translatedText: string;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ITranslationService {
  translate(request: TranslateRequest): Promise<TranslateResponse>;
  buildSpokenPrompt(targetLang: string, customPrompt?: string): string;
}

const DEFAULT_PROMPTS: Record<string, string> = {
  'es-ES': 'You are an expert native linguist specializing in Castilian Spanish spoken fluency. Translate the following text into natural, idiomatic European Spanish as spoken in daily life in Spain. Do not use textbook phrasing. Output ONLY the translated foreign spoken text.',
  'ja-JP': 'You are an expert native linguist specializing in natural conversational Japanese. Translate the following text into natural, idiomatic spoken Japanese. Output ONLY the translated foreign spoken text.',
};

export class TranslationService implements ITranslationService {
  buildSpokenPrompt(targetLang: string, customPrompt?: string): string {
    if (customPrompt && customPrompt.trim().length > 0) {
      return customPrompt.trim();
    }
    return DEFAULT_PROMPTS[targetLang] || 'You are an expert native translator. Translate the text into natural daily spoken foreign language. Output ONLY the translated spoken text.';
  }

  resolveFetchConfig(request: TranslateRequest, key: string): { url: string; headers: Record<string, string> } {
    const rawEndpoint = getAnthropicMessagesEndpoint(request.baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': key,
    };

    if (request.useProxy || rawEndpoint.startsWith('/api/proxy')) {
      const proxyUrl = rawEndpoint.startsWith('/api/proxy') ? rawEndpoint : '/api/proxy/anthropic';
      if (!rawEndpoint.startsWith('/api/proxy')) {
        headers['x-target-endpoint'] = rawEndpoint;
      }
      if (rawEndpoint.includes('api.anthropic.com')) {
        headers['anthropic-version'] = '2023-06-01';
      }
      return { url: proxyUrl, headers };
    }

    if (rawEndpoint.includes('api.anthropic.com')) {
      headers['anthropic-version'] = '2023-06-01';
    }
    return { url: rawEndpoint, headers };
  }

  async translate(request: TranslateRequest): Promise<TranslateResponse> {
    const key = (request.apiKey ?? '').trim();
    if (!key) {
      throw new Error('Translation API Key is missing. Please configure it in Settings.');
    }

    const { url, headers } = this.resolveFetchConfig(request, key);
    const model = request.model || 'claude-3-5-sonnet-20241022';
    const systemPrompt = this.buildSpokenPrompt(request.targetLang, request.customPrompt);

    const payload = {
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: request.sourceText }],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Translation API error: HTTP ${res.status}`);
    }

    const data = await res.json() as {
      content: Array<{ type: string; text: string }>;
      model: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const translatedText = data.content?.[0]?.text?.trim() || '';
    return {
      translatedText,
      modelUsed: data.model || model,
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    };
  }
}

export const translationService = new TranslationService();
