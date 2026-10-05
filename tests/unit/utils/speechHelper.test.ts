import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isSpeechSynthesisSupported, speakText, getBrowserVoices } from '../../../src/utils/speechHelper';

describe('speechHelper', () => {
  const originalSpeechSynthesis = window.speechSynthesis;
  const originalUtterance = window.SpeechSynthesisUtterance;

  let mockCancel: ReturnType<typeof vi.fn>;
  let mockSpeak: ReturnType<typeof vi.fn>;
  let mockGetVoices: ReturnType<typeof vi.fn>;

  const dummyVoices = [
    { voiceURI: 'es-voice-1', name: 'Monica', lang: 'es-ES', default: true, localService: true },
    { voiceURI: 'en-voice-1', name: 'Samantha', lang: 'en-US', default: false, localService: true },
  ] as unknown as SpeechSynthesisVoice[];

  beforeEach(() => {
    mockCancel = vi.fn();
    mockSpeak = vi.fn();
    mockGetVoices = vi.fn().mockReturnValue(dummyVoices);

    const mockSynth = {
      cancel: mockCancel,
      speak: mockSpeak,
      getVoices: mockGetVoices,
    };

    class MockUtterance {
      text: string;
      lang = '';
      voice: SpeechSynthesisVoice | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }

    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSynth,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: MockUtterance,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: originalSpeechSynthesis,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: originalUtterance,
      writable: true,
      configurable: true,
    });
  });

  it('detects when speechSynthesis is supported', () => {
    expect(isSpeechSynthesisSupported()).toBe(true);
  });

  it('detects when speechSynthesis is not supported', () => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(isSpeechSynthesisSupported()).toBe(false);
  });

  it('detects when SpeechSynthesisUtterance is not supported', () => {
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(isSpeechSynthesisSupported()).toBe(false);
  });

  it('returns false when speakText is called with empty text', () => {
    expect(speakText('', 'es-ES')).toBe(false);
    expect(speakText('   ', 'es-ES')).toBe(false);
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('returns false when speakText is called in an unsupported environment', () => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(speakText('hola', 'es-ES')).toBe(false);
  });

  it('cancels ongoing speech and triggers utterance with target language', () => {
    const success = speakText('Perdone', 'es-ES');
    expect(success).toBe(true);
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const spokenUtterance = mockSpeak.mock.calls[0][0];
    expect(spokenUtterance.text).toBe('Perdone');
    expect(spokenUtterance.lang).toBe('es-ES');
  });

  it('catches and handles runtime error gracefully when speak throws', () => {
    mockSpeak.mockImplementationOnce(() => {
      throw new Error('Audio hardware busy');
    });
    const success = speakText('Perdone', 'es-ES');
    expect(success).toBe(false);
  });

  it('retrieves browser voices safely', () => {
    const voices = getBrowserVoices();
    expect(voices).toEqual(dummyVoices);
  });

  it('returns empty array from getBrowserVoices when speech is unsupported', () => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(getBrowserVoices()).toEqual([]);
  });

  it('applies matched voice when voiceURI is provided', () => {
    const success = speakText('Perdone', 'es-ES', 'es-voice-1');
    expect(success).toBe(true);
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const spokenUtterance = mockSpeak.mock.calls[0][0];
    expect(spokenUtterance.voice).toEqual(dummyVoices[0]);
    expect(spokenUtterance.lang).toBe('es-ES');
  });

  it('falls back to default language when voiceURI is not found', () => {
    const success = speakText('Perdone', 'es-ES', 'unknown-voice-id');
    expect(success).toBe(true);
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const spokenUtterance = mockSpeak.mock.calls[0][0];
    expect(spokenUtterance.voice).toBeNull();
    expect(spokenUtterance.lang).toBe('es-ES');
  });
});
