export class AudioContextManager {
  private unlocked = false;
  private context: AudioContext | null = null;

  setContext(ctx: AudioContext): void {
    this.context = ctx;
  }

  resetForTesting(): void {
    this.unlocked = false;
    this.context = null;
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  async unlock(): Promise<boolean> {
    if (this.unlocked) {
      return true;
    }

    try {
      if (!this.context && typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.context = new AudioContextClass();
        }
      }

      if (this.context && this.context.state === 'suspended') {
        await this.context.resume();
      }

      this.unlocked = true;
      return true;
    } catch {
      return false;
    }
  }
}

export const audioContextManager = new AudioContextManager();
