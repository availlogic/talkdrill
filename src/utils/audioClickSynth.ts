type AudioContextCreator = () => AudioContext | null;

let customFactory: AudioContextCreator | null = null;
let sharedContext: AudioContext | null = null;

export function setAudioContextFactory(factory: AudioContextCreator): void {
  customFactory = factory;
  sharedContext = null;
}

function getAudioContext(): AudioContext | null {
  if (customFactory) {
    return customFactory();
  }

  if (typeof window === 'undefined') {
    return null;
  }

  if (!sharedContext) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      sharedContext = new AudioContextClass();
    }
  }

  return sharedContext;
}

export function playMechanicalClick(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.012);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.012);
}
