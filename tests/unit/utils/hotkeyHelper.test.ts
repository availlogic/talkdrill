import { describe, it, expect } from 'vitest';
import { isMatchingHotkey, getHotkeyDisplayLabel } from '../../../src/utils/hotkeyHelper';

describe('hotkeyHelper (TDD)', () => {
  describe('isMatchingHotkey', () => {
    it('matches Alt key for both left, right, and key-only when hotkey is Alt', () => {
      const eLeft = { key: 'Alt', code: 'AltLeft', repeat: false } as KeyboardEvent;
      const eRight = { key: 'Alt', code: 'AltRight', repeat: false } as KeyboardEvent;
      const eKeyOnly = { key: 'Alt', code: 'Unknown', repeat: false } as KeyboardEvent;
      expect(isMatchingHotkey(eLeft, 'Alt')).toBe(true);
      expect(isMatchingHotkey(eRight, 'Alt')).toBe(true);
      expect(isMatchingHotkey(eKeyOnly, 'Alt')).toBe(true);
    });

    it('matches AltLeft strictly when configured', () => {
      const eLeft = { key: 'Alt', code: 'AltLeft', repeat: false } as KeyboardEvent;
      const eRight = { key: 'Alt', code: 'AltRight', repeat: false } as KeyboardEvent;
      expect(isMatchingHotkey(eLeft, 'AltLeft')).toBe(true);
      expect(isMatchingHotkey(eRight, 'AltLeft')).toBe(false);
    });

    it('matches Meta key for both, key-only, and MetaLeft specifically', () => {
      const eLeft = { key: 'Meta', code: 'MetaLeft', repeat: false } as KeyboardEvent;
      const eRight = { key: 'Meta', code: 'MetaRight', repeat: false } as KeyboardEvent;
      const eKeyOnly = { key: 'Meta', code: 'Unknown', repeat: false } as KeyboardEvent;
      expect(isMatchingHotkey(eLeft, 'Meta')).toBe(true);
      expect(isMatchingHotkey(eRight, 'Meta')).toBe(true);
      expect(isMatchingHotkey(eKeyOnly, 'Meta')).toBe(true);
      expect(isMatchingHotkey(eLeft, 'MetaLeft')).toBe(true);
      expect(isMatchingHotkey(eRight, 'MetaLeft')).toBe(false);
    });

    it('matches Control and ControlLeft', () => {
      const eLeft = { key: 'Control', code: 'ControlLeft', repeat: false } as KeyboardEvent;
      const eRight = { key: 'Control', code: 'ControlRight', repeat: false } as KeyboardEvent;
      const eKeyOnly = { key: 'Control', code: 'Unknown', repeat: false } as KeyboardEvent;
      expect(isMatchingHotkey(eLeft, 'Control')).toBe(true);
      expect(isMatchingHotkey(eRight, 'Control')).toBe(true);
      expect(isMatchingHotkey(eKeyOnly, 'Control')).toBe(true);
      expect(isMatchingHotkey(eLeft, 'ControlLeft')).toBe(true);
      expect(isMatchingHotkey(eRight, 'ControlLeft')).toBe(false);
    });

    it('matches Shift and KeyD and custom keys', () => {
      const eShiftL = { key: 'Shift', code: 'ShiftLeft', repeat: false } as KeyboardEvent;
      const eShiftR = { key: 'Shift', code: 'ShiftRight', repeat: false } as KeyboardEvent;
      const eShiftKey = { key: 'Shift', code: 'Unknown', repeat: false } as KeyboardEvent;
      expect(isMatchingHotkey(eShiftL, 'Shift')).toBe(true);
      expect(isMatchingHotkey(eShiftR, 'Shift')).toBe(true);
      expect(isMatchingHotkey(eShiftKey, 'Shift')).toBe(true);

      const eD = { key: 'd', code: 'KeyD', repeat: false } as KeyboardEvent;
      expect(isMatchingHotkey(eD, 'KeyD')).toBe(true);

      const eCodeOnly = { key: 'other', code: 'F1', repeat: false } as KeyboardEvent;
      expect(isMatchingHotkey(eCodeOnly, 'F1')).toBe(true);

      const eKeyOnly = { key: 'F2', code: 'other', repeat: false } as KeyboardEvent;
      expect(isMatchingHotkey(eKeyOnly, 'F2')).toBe(true);

      const eNoMatch = { key: 'a', code: 'KeyA', repeat: false } as KeyboardEvent;
      expect(isMatchingHotkey(eNoMatch, 'KeyD')).toBe(false);
    });

    it('ignores repeat key events', () => {
      const eRepeat = { key: 'Alt', code: 'AltLeft', repeat: true } as KeyboardEvent;
      expect(isMatchingHotkey(eRepeat, 'Alt')).toBe(false);
    });

    it('ignores input, textarea, and contenteditable event targets', () => {
      const inputEl = document.createElement('input');
      const eInput = { key: 'Alt', code: 'AltLeft', repeat: false, target: inputEl } as unknown as KeyboardEvent;
      expect(isMatchingHotkey(eInput, 'Alt')).toBe(false);

      const textareaEl = document.createElement('textarea');
      const eTextarea = { key: 'Alt', code: 'AltLeft', repeat: false, target: textareaEl } as unknown as KeyboardEvent;
      expect(isMatchingHotkey(eTextarea, 'Alt')).toBe(false);

      const editableEl = document.createElement('div');
      Object.defineProperty(editableEl, 'isContentEditable', { value: true, configurable: true });
      const eEditable = { key: 'Alt', code: 'AltLeft', repeat: false, target: editableEl } as unknown as KeyboardEvent;
      expect(isMatchingHotkey(eEditable, 'Alt')).toBe(false);

      const normalEl = document.createElement('div');
      const eNormal = { key: 'Alt', code: 'AltLeft', repeat: false, target: normalEl } as unknown as KeyboardEvent;
      expect(isMatchingHotkey(eNormal, 'Alt')).toBe(true);

      const eNullTarget = { key: 'Alt', code: 'AltLeft', repeat: false, target: null } as unknown as KeyboardEvent;
      expect(isMatchingHotkey(eNullTarget, 'Alt')).toBe(true);
    });
  });

  describe('getHotkeyDisplayLabel', () => {
    it('returns human-friendly labels for configured hotkeys', () => {
      expect(getHotkeyDisplayLabel('Alt')).toBe('Option / Alt');
      expect(getHotkeyDisplayLabel('AltLeft')).toBe('Left Option');
      expect(getHotkeyDisplayLabel('Meta')).toBe('Command ⌘');
      expect(getHotkeyDisplayLabel('MetaLeft')).toBe('Left Command ⌘');
      expect(getHotkeyDisplayLabel('Control')).toBe('Control');
      expect(getHotkeyDisplayLabel('ControlLeft')).toBe('Left Control');
      expect(getHotkeyDisplayLabel('Shift')).toBe('Shift');
      expect(getHotkeyDisplayLabel('KeyD')).toBe('Key D');
      expect(getHotkeyDisplayLabel('Custom')).toBe('Custom');
    });
  });
});
