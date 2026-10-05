const HOTKEY_LABELS: Record<string, string> = {
  Alt: 'Option / Alt',
  AltLeft: 'Left Option',
  Meta: 'Command ⌘',
  MetaLeft: 'Left Command ⌘',
  Control: 'Control',
  ControlLeft: 'Left Control',
  Shift: 'Shift',
  KeyD: 'Key D',
};

export function isMatchingHotkey(e: KeyboardEvent, targetHotkey: string): boolean {
  if (e.repeat) {
    return false;
  }
  const target = e.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return false;
  }
  return e.key === targetHotkey || e.code === targetHotkey;
}

export function getHotkeyDisplayLabel(hotkey: string): string {
  return HOTKEY_LABELS[hotkey] ?? hotkey;
}
