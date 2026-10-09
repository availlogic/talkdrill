import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../../../src/storage/db';
import { AudioService } from '../../../src/services/audioService';

describe('AudioService (TDD)', () => {
  let service: AudioService;
  const articleId = 'art-audio-test';

  beforeEach(async () => {
    await db.audios.clear();
    service = new AudioService();
  });

  it('rejects upload of files over 50MB', async () => {
    const bigFile = new File([''], 'big.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(bigFile, 'size', { value: 50 * 1024 * 1024 + 10 });

    await expect(
      service.uploadLocalAudio({
        articleId,
        file: bigFile,
      })
    ).rejects.toThrow('Audio file size exceeds 50MB limit');
  });

  it('rejects unsupported audio file formats', async () => {
    const invalidFile = new File(['test'], 'file.txt', { type: 'text/plain' });

    await expect(
      service.uploadLocalAudio({
        articleId,
        file: invalidFile,
      })
    ).rejects.toThrow('Unsupported audio format');
  });

  it('stores uploaded valid audio as native Blob in IndexedDB', async () => {
    const validFile = new File(['mock audio stream'], 'myaudio.mp3', { type: 'audio/mpeg' });

    const item = await service.uploadLocalAudio({
      articleId,
      file: validFile,
    });

    expect(item.id).toBeDefined();
    expect(item.articleId).toBe(articleId);
    expect(item.fileName).toBe('myaudio.mp3');
    expect(item.mimeType).toBe('audio/mpeg');
    expect(item.sourceType).toBe('upload');

    const inDb = await db.audios.get(item.id);
    expect(inDb?.fileName).toBe('myaudio.mp3');
  });

  it('synthesizes audio via TTS provider API and saves Blob', async () => {
    const fakeAudioBinary = new Uint8Array([0x49, 0x44, 0x33]); // ID3 tag header
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob([fakeAudioBinary], { type: 'audio/mpeg' }),
    });

    globalThis.fetch = mockFetch;

    const audioItem = await service.synthesize({
      articleId,
      text: '¿Nos cobras, por favor?',
      targetLang: 'es-ES',
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-tts-test',
      modelOrVoiceId: 'alloy',
    });

    expect(audioItem.articleId).toBe(articleId);
    expect(audioItem.sourceType).toBe('tts');
    expect(audioItem.blob).toBeInstanceOf(Blob);

    const saved = await service.getAudioByArticleId(articleId);
    expect(saved?.id).toBe(audioItem.id);
  });

  it('throws error when TTS API response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(
      service.synthesize({
        articleId,
        text: 'fail test',
        targetLang: 'es-ES',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        modelOrVoiceId: 'alloy',
      })
    ).rejects.toThrow('TTS synthesis API error: HTTP 500');
  });

  it('throws error when TTS API key is empty', async () => {
    await expect(
      service.synthesize({
        articleId,
        text: 'test',
        targetLang: 'es',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '   ',
        modelOrVoiceId: 'alloy',
      })
    ).rejects.toThrow('TTS API Key is missing');
  });

  it('deletes audio by id', async () => {
    const file = new File(['sound'], 's.mp3', { type: 'audio/mpeg' });
    const item = await service.uploadLocalAudio({ articleId, file });
    await service.deleteAudio(item.id);
    const inDb = await service.getAudioByArticleId(articleId);
    expect(inDb).toBeNull();
  });

  it('exports audio file to disk via DOM anchor click', () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    const fakeItem = {
      id: 'aud-1',
      articleId: 'art-1',
      blob: new Blob(['audio']),
      mimeType: 'audio/mpeg',
      fileName: 'test.mp3',
      fileSize: 5,
      duration: 1,
      sourceType: 'tts' as const,
      createdAt: 100,
    };

    service.exportAudioFile(fakeItem);
    expect(createUrlSpy).toHaveBeenCalledWith(fakeItem.blob);
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });

  it('processes valid local audio file upload correctly', async () => {
    const file = new File(['valid content'], 'speech.mp3', { type: 'audio/mpeg' });
    const result = await service.processLocalAudioUpload(file);
    expect(result).toBe(file);
  });

  it('rejects oversized local audio file upload', async () => {
    const file = new File(['oversized content'], 'big.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(file, 'size', { value: 55 * 1024 * 1024 });
    await expect(service.processLocalAudioUpload(file)).rejects.toThrow('Audio file size exceeds 50MB limit');
  });

  it('rejects unsupported format in processLocalAudioUpload', async () => {
    const file = new File(['text content'], 'invalid.txt', { type: 'text/plain' });
    await expect(service.processLocalAudioUpload(file)).rejects.toThrow('Unsupported audio format');
  });

  it('generates speech blob via generateSpeech', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['tts-bytes'], { type: 'audio/mpeg' }),
    });

    const blob = await service.generateSpeech({
      text: 'Hola mundo',
      apiKey: 'test-key',
    });
    expect(blob).toBeInstanceOf(Blob);
  });

  it('throws error in generateSpeech if apiKey is missing', async () => {
    await expect(service.generateSpeech({ text: 'Hola', apiKey: '' })).rejects.toThrow(
      'TTS API Key is missing'
    );
  });

  it('throws error in generateSpeech if API response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    await expect(
      service.generateSpeech({ text: 'Hola', apiKey: 'bad-key' })
    ).rejects.toThrow('TTS synthesis API error: HTTP 401');
  });

  it('saves audio blob and associates with article via saveAudioBlob', async () => {
    const blob = new Blob(['sample-data'], { type: 'audio/mpeg' });
    const item = await service.saveAudioBlob('art-blob-save', blob, 'upload');
    expect(item.id).toBeDefined();
    expect(item.articleId).toBe('art-blob-save');
    expect(item.sourceType).toBe('upload');

    const inDb = await db.audios.get(item.id);
    expect(inDb).toBeDefined();
  });

  it('replaces existing audio record when saveAudioBlob is called again', async () => {
    const blob1 = new Blob(['data-1'], { type: 'audio/mpeg' });
    const item1 = await service.saveAudioBlob('art-replace', blob1, 'upload');

    const blob2 = new Blob(['data-2'], { type: 'audio/mpeg' });
    const item2 = await service.saveAudioBlob('art-replace', blob2, 'upload');

    expect(item2.id).not.toBe(item1.id);
    const oldInDb = await db.audios.get(item1.id);
    expect(oldInDb).toBeUndefined();

    const currentAudios = await db.audios.where('articleId').equals('art-replace').toArray();
    expect(currentAudios.length).toBe(1);
    expect(currentAudios[0]?.id).toBe(item2.id);
  });

  it('deletes audio by article ID and updates article audioId', async () => {
    await db.articles.add({
      id: 'art-del-audio',
      title: 'T',
      sourceText: '',
      targetText: 'X',
      sourceLang: 'en',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
      targetCount: 500,
      currentCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isArchived: 0,
    });

    const blob = new Blob(['data'], { type: 'audio/mpeg' });
    await service.saveAudioBlob('art-del-audio', blob, 'upload');

    await service.deleteAudioByArticleId('art-del-audio');
    const audios = await db.audios.where('articleId').equals('art-del-audio').toArray();
    expect(audios.length).toBe(0);

    const art = await db.articles.get('art-del-audio');
    expect(art?.audioId).toBeUndefined();
  });

  it('lazily fetches audio from cloud when local audio is missing but article has audioId', async () => {
    const { syncManager } = await import('../../../src/services/syncManager');
    syncManager.setSyncKey('TD-9X7K-M2P4-W8N3-7B5D');

    await db.articles.add({
      id: 'art-lazy',
      title: 'Lazy Title',
      sourceText: '',
      targetText: 'Target',
      sourceLang: 'en',
      targetLang: 'es',
      mode: 'direct_foreign',
      targetCount: 100,
      currentCount: 0,
      audioId: 'aud-cloud-123',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isArchived: 0,
    });

    const mockBlob = new Blob(['cloud-audio'], { type: 'audio/mpeg' });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => mockBlob,
    });

    const audio = await service.getAudioByArticleId('art-lazy');
    expect(audio).toBeDefined();
    expect(audio?.id).toBe('aud-cloud-123');

    // Should now be cached in local IndexedDB
    const cached = await db.audios.get('aud-cloud-123');
    expect(cached).toBeDefined();
  });
});

