export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.speechSynthesis) &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
}

export function getBrowserVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported() || !window.speechSynthesis.getVoices) {
    return [];
  }
  return window.speechSynthesis.getVoices();
}

function resolveVoice(voices: SpeechSynthesisVoice[], voiceURI?: string): SpeechSynthesisVoice | undefined {
  if (!voiceURI) return undefined;
  return voices.find((v) => v.voiceURI === voiceURI || v.name === voiceURI);
}

export function speakText(text: string, lang: string, voiceURI?: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || !isSpeechSynthesisSupported()) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(trimmed);
    const matchedVoice = resolveVoice(getBrowserVoices(), voiceURI);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang || lang;
    } else {
      utterance.lang = lang;
    }
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
