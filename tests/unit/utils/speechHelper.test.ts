import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isSpeechSynthesisSupported, speakText } from '../../../src/utils/speechHelper';

describe('speechHelper', () => {
  const originalSpeechSynthesis = window.speechSynthesis;
  const originalUtterance = window.SpeechSynthesisUtterance;

  let mockCancel: ReturnType<typeof vi.fn>;
  let mockSpeak: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockCancel = vi.fn();
    mockSpeak = vi.fn();

    const mockSynth = {
      cancel: mockCancel,
      speak: mockSpeak,
    };

    class MockUtterance {
      text: string;
      lang = '';
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
});
