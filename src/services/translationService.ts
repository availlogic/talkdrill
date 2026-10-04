export interface TranslateRequest {
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  apiKey: string;
  baseUrl?: string | undefined;
  model?: string | undefined;
  customPrompt?: string | undefined;
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

  async translate(request: TranslateRequest): Promise<TranslateResponse> {
    const key = (request.apiKey ?? '').trim();
    if (!key) {
      throw new Error('Translation API Key is missing. Please configure it in Settings.');
    }

    const baseUrl = (request.baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
    const model = request.model || 'claude-3-5-sonnet-20241022';
    const systemPrompt = this.buildSpokenPrompt(request.targetLang, request.customPrompt);

    const payload = {
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: request.sourceText }],
    };

    const res = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
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
