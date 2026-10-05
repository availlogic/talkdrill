import { db, type AudioRecord } from '../storage/db';
import { type AudioItem } from '../types/models';

export interface SynthesizeAudioRequest {
  articleId: string;
  text: string;
  targetLang: string;
  provider: 'openai' | 'elevenlabs' | 'minimaxi' | 'custom';
  baseUrl: string;
  apiKey: string;
  modelOrVoiceId: string;
}

export interface UploadAudioRequest {
  articleId: string;
  file: File;
}

export interface GenerateSpeechParams {
  text: string;
  voice?: string;
  baseUrl?: string;
  apiKey?: string;
}

export interface IAudioService {
  synthesize(request: SynthesizeAudioRequest): Promise<AudioItem>;
  generateSpeech(params: GenerateSpeechParams): Promise<Blob>;
  processLocalAudioUpload(file: File): Promise<Blob>;
  saveAudioBlob(articleId: string, blob: Blob | File, sourceType?: 'tts' | 'upload'): Promise<AudioItem>;
  uploadLocalAudio(request: UploadAudioRequest): Promise<AudioItem>;
  getAudioByArticleId(articleId: string): Promise<AudioItem | null>;
  deleteAudio(id: string): Promise<void>;
  deleteAudioByArticleId(articleId: string): Promise<void>;
  exportAudioFile(audioItem: AudioItem): void;
}

const MAX_AUDIO_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_PREFIXES = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp4', 'audio/aac'];

function mapRecordToAudioItem(record: AudioRecord): AudioItem {
  return {
    id: record.id,
    articleId: record.articleId,
    blob: record.blob,
    mimeType: record.mimeType,
    fileName: record.fileName,
    fileSize: record.fileSize,
    duration: record.duration,
    sourceType: record.sourceType,
    createdAt: record.createdAt,
  };
}

export class AudioService implements IAudioService {
  async processLocalAudioUpload(file: File): Promise<Blob> {
    if (file.size > MAX_AUDIO_BYTES) {
      throw new Error('Audio file size exceeds 50MB limit');
    }
    const isAllowedMime = ALLOWED_MIME_PREFIXES.some((m) => file.type.startsWith(m));
    const isAllowedExt = /\.(mp3|wav|m4a|aac)$/i.test(file.name);
    if (!isAllowedMime && !isAllowedExt) {
      throw new Error('Unsupported audio format. Please upload .mp3, .wav, or .m4a files.');
    }
    return file;
  }

  async generateSpeech(params: GenerateSpeechParams): Promise<Blob> {
    const { text, baseUrl = 'https://api.openai.com/v1', apiKey = '', voice = 'alloy' } = params;
    if (!apiKey.trim()) {
      throw new Error('TTS API Key is missing. Please configure it in Settings.');
    }
    const targetUrl = `${baseUrl.replace(/\/+$/, '')}/audio/speech`;
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice,
        response_format: 'mp3',
      }),
    });
    if (!res.ok) {
      throw new Error(`TTS synthesis API error: HTTP ${res.status}`);
    }
    return await res.blob();
  }

  async saveAudioBlob(
    articleId: string,
    blob: Blob | File,
    sourceType: 'tts' | 'upload' = 'upload'
  ): Promise<AudioItem> {
    await db.audios.where('articleId').equals(articleId).delete();
    const id = crypto.randomUUID();
    const now = Date.now();
    const fileName = blob instanceof File ? blob.name : `drill-${articleId}.mp3`;
    const record: AudioRecord = {
      id,
      articleId,
      blob,
      mimeType: blob.type || 'audio/mpeg',
      fileName,
      fileSize: blob.size,
      duration: 0,
      sourceType,
      createdAt: now,
    };
    await db.audios.add(record);
    await db.articles.update(articleId, { audioId: id, updatedAt: now });
    return mapRecordToAudioItem(record);
  }

  async uploadLocalAudio(request: UploadAudioRequest): Promise<AudioItem> {
    const { file, articleId } = request;
    if (file.size > MAX_AUDIO_BYTES) {
      throw new Error('Audio file size exceeds 50MB limit');
    }

    const isAllowedMime = ALLOWED_MIME_PREFIXES.some((m) => file.type.startsWith(m));
    const isAllowedExt = /\.(mp3|wav|m4a|aac)$/i.test(file.name);

    if (!isAllowedMime && !isAllowedExt) {
      throw new Error('Unsupported audio format. Please upload .mp3, .wav, or .m4a files.');
    }

    const id = crypto.randomUUID();
    const now = Date.now();
    const record: AudioRecord = {
      id,
      articleId,
      blob: file,
      mimeType: file.type || 'audio/mpeg',
      fileName: file.name,
      fileSize: file.size,
      duration: 0,
      sourceType: 'upload',
      createdAt: now,
    };

    await db.audios.add(record);
    await db.articles.update(articleId, { audioId: id, updatedAt: now });

    return mapRecordToAudioItem(record);
  }

  async synthesize(request: SynthesizeAudioRequest): Promise<AudioItem> {
    const { articleId, text, baseUrl, apiKey, modelOrVoiceId } = request;
    if (!apiKey.trim()) {
      throw new Error('TTS API Key is missing. Please configure it in Settings.');
    }

    const targetUrl = `${baseUrl.replace(/\/+$/, '')}/audio/speech`;
    const payload = {
      model: 'tts-1',
      input: text,
      voice: modelOrVoiceId || 'alloy',
      response_format: 'mp3',
    };

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`TTS synthesis API error: HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const id = crypto.randomUUID();
    const now = Date.now();

    const record: AudioRecord = {
      id,
      articleId,
      blob,
      mimeType: blob.type || 'audio/mpeg',
      fileName: `drill-${articleId}.mp3`,
      fileSize: blob.size,
      duration: 0,
      sourceType: 'tts',
      createdAt: now,
    };

    await db.audios.add(record);
    await db.articles.update(articleId, { audioId: id, updatedAt: now });

    return mapRecordToAudioItem(record);
  }

  async getAudioByArticleId(articleId: string): Promise<AudioItem | null> {
    const record = await db.audios.where('articleId').equals(articleId).first();
    return record ? mapRecordToAudioItem(record) : null;
  }

  async deleteAudio(id: string): Promise<void> {
    await db.audios.delete(id);
  }

  async deleteAudioByArticleId(articleId: string): Promise<void> {
    await db.audios.where('articleId').equals(articleId).delete();
    const existing = await db.articles.get(articleId);
    if (existing) {
      await db.articles.update(articleId, { audioId: undefined, updatedAt: Date.now() });
    }
  }

  exportAudioFile(audioItem: AudioItem): void {
    if (typeof window === 'undefined') return;

    const url = URL.createObjectURL(audioItem.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = audioItem.fileName || 'talkdrill-audio.mp3';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export const audioService = new AudioService();
