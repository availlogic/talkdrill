import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getSystemTheme,
  resolveEffectiveTheme,
  applyTheme,
  themeManager,
} from '../../../src/utils/themeManager';

describe('themeManager (TDD)', () => {
  let listeners: ((e: MediaQueryListEvent) => void)[] = [];
  let matchesValue = false;
  let addEventSpy: ReturnType<typeof vi.fn>;
  let removeEventSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listeners = [];
    matchesValue = false;
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');

    addEventSpy = vi.fn((_type: string, listener: (e: MediaQueryListEvent) => void) => {
      listeners.push(listener);
    });
    removeEventSpy = vi.fn((_type: string, listener: (e: MediaQueryListEvent) => void) => {
      listeners = listeners.filter((l) => l !== listener);
    });

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? matchesValue : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: addEventSpy,
      removeEventListener: removeEventSpy,
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    themeManager.destroy();
  });

  it('detects system theme accurately from matchMedia query', () => {
    matchesValue = false;
    expect(getSystemTheme()).toBe('light');

    matchesValue = true;
    expect(getSystemTheme()).toBe('dark');
  });

  it('falls back to light if matchMedia is unavailable', () => {
    const origMatchMedia = window.matchMedia;
    // @ts-expect-error test fallback
    window.matchMedia = undefined;
    expect(getSystemTheme()).toBe('light');
    window.matchMedia = origMatchMedia;
  });

  it('resolves effective theme based on preference and system state', () => {
    matchesValue = true;
    expect(resolveEffectiveTheme('light')).toBe('light');
    expect(resolveEffectiveTheme('dark')).toBe('dark');
    expect(resolveEffectiveTheme('system')).toBe('dark');

    matchesValue = false;
    expect(resolveEffectiveTheme('system')).toBe('light');
  });

  it('applies theme classes and data attributes to documentElement', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('initializes and responds to system theme preference changes', () => {
    matchesValue = false;
    themeManager.init('system');
    expect(themeManager.getPreference()).toBe('system');
    expect(themeManager.getEffectiveTheme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    expect(addEventSpy).toHaveBeenCalledWith('change', expect.any(Function));

    // Simulate system preference change to dark
    matchesValue = true;
    for (const listener of listeners) {
      listener({ matches: true } as MediaQueryListEvent);
    }
    expect(themeManager.getEffectiveTheme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('reads cached preference from localStorage when initialized without arguments', () => {
    localStorage.setItem('talkdrill_theme_pref', 'dark');
    themeManager.init();
    expect(themeManager.getPreference()).toBe('dark');
    expect(themeManager.getEffectiveTheme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    localStorage.clear();
    themeManager.init();
    expect(themeManager.getPreference()).toBe('system');
  });

  it('persists preference to localStorage and updates effective theme', () => {
    themeManager.setPreference('dark');
    expect(localStorage.getItem('talkdrill_theme_pref')).toBe('dark');
    expect(themeManager.getPreference()).toBe('dark');
    expect(themeManager.getEffectiveTheme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    themeManager.setPreference('light');
    expect(localStorage.getItem('talkdrill_theme_pref')).toBe('light');
    expect(themeManager.getPreference()).toBe('light');
    expect(themeManager.getEffectiveTheme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('cleans up event listeners when switching away from system or destroying', () => {
    themeManager.init('system');
    expect(addEventSpy).toHaveBeenCalledWith('change', expect.any(Function));

    themeManager.setPreference('light');
    expect(removeEventSpy).toHaveBeenCalledWith('change', expect.any(Function));

    // Re-initialize system and call destroy
    themeManager.setPreference('system');
    themeManager.destroy();
    expect(removeEventSpy).toHaveBeenCalledTimes(2);
  });

  it('handles missing document or localStorage gracefully without throwing', () => {
    const origDoc = globalThis.document;
    // @ts-expect-error test
    delete globalThis.document;
    expect(() => applyTheme('dark')).not.toThrow();
    globalThis.document = origDoc;

    const origStorage = globalThis.localStorage;
    // @ts-expect-error test
    delete globalThis.localStorage;
    expect(() => themeManager.init()).not.toThrow();
    expect(() => themeManager.setPreference('dark')).not.toThrow();
    globalThis.localStorage = origStorage;
  });

  it('safely handles cleanup when no listener was registered', () => {
    themeManager.init('light');
    expect(() => themeManager.destroy()).not.toThrow();
  });
});
