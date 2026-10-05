export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.speechSynthesis) &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
}

export function speakText(text: string, lang: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || !isSpeechSynthesisSupported()) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
