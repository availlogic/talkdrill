export type LanguageMode = 'translate_needed' | 'direct_foreign';

export type DrillMilestone = 50 | 150 | 300 | 500;

export type PlaybackRate = 0.5 | 0.75 | 1.0 | 1.25 | 1.5;

export interface Article {
  id: string;
  title: string;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  mode: LanguageMode;
  targetCount: number;
  currentCount: number;
  audioId?: string | undefined;
  createdAt: number;
  updatedAt: number;
  lastPracticedAt?: number | undefined;
  isArchived: boolean;
}

export interface AudioItem {
  id: string;
  articleId: string;
  blob: Blob;
  mimeType: string;
  fileName: string;
  fileSize: number;
  duration: number;
  sourceType: 'tts' | 'upload';
  createdAt: number;
}

export interface DrillLog {
  id?: number | undefined;
  articleId: string;
  delta: number;
  resultingCount: number;
  timestamp: number;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface DictionaryConfig {
  hotkey: string;
  cacheTtlDays: number;
}

export interface AppSettings {
  theme?: ThemePreference | undefined;
  translation: {
    enabled: boolean;
    baseUrl: string;
    apiKey: string;
    model: string;
    customPrompt?: string | undefined;
    useProxy?: boolean | undefined;
  };
  tts: {
    provider: 'openai' | 'elevenlabs' | 'minimax' | 'minimaxi' | 'custom';
    baseUrl: string;
    apiKey: string;
    modelOrVoiceId: string;
  };
  printOptions: {
    defaultTallyBoxes: 60 | 100;
  };
  dictionary: DictionaryConfig;
}


export interface ZhengStrokeState {
  fullZhengCount: number;
  partialStrokes: number;
  totalCount: number;
}

export interface MilestoneResult {
  hasReached: boolean;
  milestone?: DrillMilestone;
  title?: string;
  description?: string;
}

export interface LoopRegion {
  startSec: number;
  endSec: number;
  isActive: boolean;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: PlaybackRate;
  loopRegion: LoopRegion | null;
  isAudioUnlocked: boolean;
}

export interface WordLookupResult {
  text: string;
  lang: string;
  ipa?: string | undefined;
  partOfSpeech?: string | undefined;
  translation: string;
  contextNote?: string | undefined;
  source?: 'cache' | 'api' | 'fallback' | undefined;
}


export interface WordLookupRecord extends WordLookupResult {
  id?: number | undefined;
  timestamp: number;
}

