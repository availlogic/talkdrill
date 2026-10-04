import { type ThemePreference } from '../types/models';

export type EffectiveTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'talkdrill_theme_pref';

function canUseMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

export function getSystemTheme(): EffectiveTheme {
  if (!canUseMatchMedia()) {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveEffectiveTheme(preference: ThemePreference): EffectiveTheme {
  if (preference === 'system') {
    return getSystemTheme();
  }
  return preference;
}

export function applyTheme(theme: EffectiveTheme): void {
  if (typeof document === 'undefined') {
    return;
  }
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.setAttribute('data-theme', theme);
}

export class ThemeManager {
  private currentPreference: ThemePreference = 'system';
  private mediaQueryList: MediaQueryList | null = null;
  private listener: ((e: MediaQueryListEvent) => void) | null = null;

  init(initialPreference?: ThemePreference): void {
    const cached = typeof localStorage !== 'undefined' ? (localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null) : null;
    this.currentPreference = initialPreference ?? cached ?? 'system';
    this.setupMediaListener();
    this.syncTheme();
  }

  setPreference(preference: ThemePreference): void {
    this.currentPreference = preference;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
    this.setupMediaListener();
    this.syncTheme();
  }

  getPreference(): ThemePreference {
    return this.currentPreference;
  }

  getEffectiveTheme(): EffectiveTheme {
    return resolveEffectiveTheme(this.currentPreference);
  }

  private setupMediaListener(): void {
    this.cleanupListener();
    if (this.currentPreference !== 'system' || !canUseMatchMedia()) {
      return;
    }
    this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    this.listener = () => {
      this.syncTheme();
    };
    this.mediaQueryList.addEventListener('change', this.listener);
  }

  private syncTheme(): void {
    const effective = this.getEffectiveTheme();
    applyTheme(effective);
  }

  private cleanupListener(): void {
    if (this.mediaQueryList && this.listener) {
      this.mediaQueryList.removeEventListener('change', this.listener);
      this.mediaQueryList = null;
      this.listener = null;
    }
  }

  destroy(): void {
    this.cleanupListener();
  }
}

export const themeManager = new ThemeManager();
