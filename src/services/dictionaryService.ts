import { db } from '../storage/db';
import { SettingsService } from './settingsService';
import { TranslationService } from './translationService';
import type { WordLookupResult, AppSettings } from '../types/models';

export interface LookupWordParams {
  text: string;
  lang: string;
  contextSentence?: string | undefined;
}

const LEADING_PUNCT = /^[\s¿¡"“'«».,!?;:()[\]{}\-–—]+/;
const TRAILING_PUNCT = /[\s"”'«».,!?;:()[\]{}\-–—]+$/;
const MS_PER_DAY = 86_400_000;

export function normalizeLookupText(text: string): string {
  const trimmed = text.trim();
  const withoutLeading = trimmed.replace(LEADING_PUNCT, '');
  const withoutTrailing = withoutLeading.replace(TRAILING_PUNCT, '');
  return withoutTrailing.trim();
}

export function buildDictionaryUserPrompt(lang: string, text: string, contextSentence?: string): string {
  const lines = [`Target Language: ${lang}`, `Text: ${text}`];
  if (contextSentence && contextSentence.trim().length > 0) {
    lines.push(`Context Sentence: ${contextSentence.trim()}`);
  }
  return lines.join('\n');
}

export interface DictionaryParsedData {
  ipa?: string | undefined;
  partOfSpeech?: string | undefined;
  translation: string;
  contextNote?: string | undefined;
}


export function parseDictionaryResponse(raw: string): DictionaryParsedData {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  if (!parsed || typeof parsed.translation !== 'string' || !parsed.translation.trim()) {
    throw new Error('Invalid dictionary response format: missing translation');
  }

  return {
    ipa: typeof parsed.ipa === 'string' ? parsed.ipa.trim() : undefined,
    partOfSpeech: typeof parsed.partOfSpeech === 'string' ? parsed.partOfSpeech.trim() : undefined,
    translation: parsed.translation.trim(),
    contextNote: typeof parsed.contextNote === 'string' ? parsed.contextNote.trim() : undefined,
  };
}

const DICTIONARY_SYSTEM_PROMPT =
  'You are an expert bilingual lexicographer and linguist. Given a foreign word or phrase, its language, and optional surrounding context, produce standard IPA phonetics and clear English translation for language learners. Return ONLY a valid JSON object with keys: "ipa" (string with standard IPA slashes), "partOfSpeech" (string or null), "translation" (concise English meaning), "contextNote" (short note on nuance/formality/conjugation in this context or null). Do not include markdown code block markers or any additional commentary.';

export function buildDictionaryPayload(model: string, userPrompt: string): {
  model: string;
  max_tokens: number;
  system: string;
  messages: Array<{ role: string; content: string }>;
} {
  return {
    model,
    max_tokens: 512,
    system: DICTIONARY_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  };
}

export class DictionaryService {
  constructor(
    private settingsService = new SettingsService(),
    private translationService = new TranslationService()
  ) {}

  async clearCache(): Promise<void> {
    await db.wordLookups.clear();
  }

  private async fetchFromApi(
    normalizedText: string,
    params: LookupWordParams,
    settings: AppSettings,
    apiKey: string
  ): Promise<DictionaryParsedData> {
    const { url, headers } = this.translationService.resolveFetchConfig(
      {
        sourceText: normalizedText,
        sourceLang: 'auto',
        targetLang: params.lang,
        apiKey,
        baseUrl: settings.translation.baseUrl,
        useProxy: settings.translation.useProxy,
      },
      apiKey
    );
    const model = settings.translation.model?.trim() || 'claude-3-5-sonnet-20241022';
    const userPrompt = buildDictionaryUserPrompt(params.lang, normalizedText, params.contextSentence);
    const payload = buildDictionaryPayload(model, userPrompt);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Dictionary API error: HTTP ${res.status}`);
    }

    const data = await res.json() as { content?: Array<{ type: string; text: string }> };
    const rawContent = data.content?.[0]?.text?.trim() || '';
    return parseDictionaryResponse(rawContent);
  }



  private async resolveTtlDays(ttlDays?: number): Promise<number> {
    if (typeof ttlDays === 'number') {
      return ttlDays;
    }
    const settings = await this.settingsService.getSettings();
    return settings.dictionary?.cacheTtlDays ?? 2;
  }

  async purgeExpiredLookups(ttlDays?: number): Promise<number> {
    const days = await this.resolveTtlDays(ttlDays);
    if (days <= 0) {
      return 0;
    }
    const cutoff = Date.now() - days * MS_PER_DAY;
    return await db.wordLookups.where('timestamp').below(cutoff).delete();
  }

  async getCachedLookup(lang: string, rawText: string, ttlDays?: number): Promise<WordLookupResult | null> {
    const normalized = normalizeLookupText(rawText);
    if (!normalized) {
      return null;
    }
    const days = await this.resolveTtlDays(ttlDays);
    return this.getCachedResult(lang, normalized, days);
  }

  private async getCachedResult(lang: string, text: string, ttlDays: number): Promise<WordLookupResult | null> {
    const cached = await db.wordLookups
      .where('[lang+text]')
      .equals([lang, text])
      .first();

    if (!cached) {
      return null;
    }

    if (ttlDays > 0) {
      const isExpired = Date.now() - cached.timestamp > ttlDays * MS_PER_DAY;
      if (isExpired) {
        await db.wordLookups.where('[lang+text]').equals([lang, text]).delete();
        return null;
      }
    }

    return {
      text: cached.text,
      lang: cached.lang,
      ipa: cached.ipa,
      partOfSpeech: cached.partOfSpeech,
      translation: cached.translation,
      contextNote: cached.contextNote,
      source: 'cache',
    };
  }



  private async saveRecord(
    text: string,
    lang: string,
    parsed: DictionaryParsedData
  ): Promise<WordLookupResult> {
    await db.wordLookups.add({
      text,
      lang,
      ipa: parsed.ipa,
      partOfSpeech: parsed.partOfSpeech,
      translation: parsed.translation,
      contextNote: parsed.contextNote,
      timestamp: Date.now(),
    });

    return {
      text,
      lang,
      ipa: parsed.ipa,
      partOfSpeech: parsed.partOfSpeech,
      translation: parsed.translation,
      contextNote: parsed.contextNote,
      source: 'api',
    };
  }

  async lookupWord(params: LookupWordParams): Promise<WordLookupResult> {
    const normalizedText = normalizeLookupText(params.text);
    if (!normalizedText) {
      throw new Error('Word or phrase cannot be empty');
    }

    const settings = await this.settingsService.getSettings();
    const ttlDays = settings.dictionary?.cacheTtlDays ?? 2;
    const cached = await this.getCachedResult(params.lang, normalizedText, ttlDays);
    if (cached) {
      return cached;
    }

    const apiKey = settings.translation.apiKey?.trim();

    if (!apiKey) {
      return {
        text: normalizedText,
        lang: params.lang,
        translation: 'Configure Anthropic API Key in Settings for AI definitions.',
        source: 'fallback',
      };
    }

    const parsed = await this.fetchFromApi(normalizedText, params, settings, apiKey);
    return this.saveRecord(normalizedText, params.lang, parsed);
  }
}

