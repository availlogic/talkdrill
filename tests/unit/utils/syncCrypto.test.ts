import { describe, it, expect } from 'vitest';
import {
  generateSyncKey,
  isValidSyncKey,
  normalizeSyncKey,
  hashSyncKey,
} from '../../../src/utils/syncCrypto';

describe('syncCrypto (TDD)', () => {
  describe('generateSyncKey', () => {
    it('generates a valid formatted sync key starting with TD-', () => {
      const key = generateSyncKey();
      expect(key).toMatch(/^TD-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    });

    it('generates distinct keys across multiple invocations', () => {
      const keys = new Set(Array.from({ length: 50 }, () => generateSyncKey()));
      expect(keys.size).toBe(50);
    });
  });

  describe('normalizeSyncKey', () => {
    it('normalizes lowercase characters and trims surrounding whitespace', () => {
      const input = '  td-9x7k-m2p4-w8n3  ';
      expect(normalizeSyncKey(input)).toBe('TD-9X7K-M2P4-W8N3');
    });

    it('returns empty string for empty or falsy inputs', () => {
      expect(normalizeSyncKey('')).toBe('');
      expect(normalizeSyncKey('   ')).toBe('');
    });
  });

  describe('isValidSyncKey', () => {
    it('accepts correctly formatted keys', () => {
      expect(isValidSyncKey('TD-9X7K-M2P4-W8N3-7B5D')).toBe(true);
      expect(isValidSyncKey('td-9x7k-m2p4-w8n3-7b5d')).toBe(true);
      expect(isValidSyncKey('  TD-9X7K-M2P4-W8N3-7B5D  ')).toBe(true);
    });

    it('rejects keys containing ambiguous characters (0, O, 1, I, L)', () => {
      expect(isValidSyncKey('TD-0X7K-M2P4-W8N3-7B5D')).toBe(false);
      expect(isValidSyncKey('TD-OX7K-M2P4-W8N3-7B5D')).toBe(false);
      expect(isValidSyncKey('TD-1X7K-M2P4-W8N3-7B5D')).toBe(false);
      expect(isValidSyncKey('TD-IX7K-M2P4-W8N3-7B5D')).toBe(false);
      expect(isValidSyncKey('TD-LX7K-M2P4-W8N3-7B5D')).toBe(false);
    });

    it('rejects keys with invalid prefix or segment length', () => {
      expect(isValidSyncKey('XX-9X7K-M2P4-W8N3-7B5D')).toBe(false);
      expect(isValidSyncKey('TD-9X7K-M2P4-W8N3')).toBe(false); // only 3 segments
      expect(isValidSyncKey('TD-9X7K-M2P4-W8N3-7B5D-9999')).toBe(false); // 5 segments
      expect(isValidSyncKey('TD-9X7-M2P4-W8N3-7B5D')).toBe(false); // segment too short
      expect(isValidSyncKey('')).toBe(false);
    });
  });

  describe('hashSyncKey', () => {
    it('produces consistent 64-char hex SHA-256 hash', async () => {
      const key = 'TD-9X7K-M2P4-W8N3-7B5D';
      const hash1 = await hashSyncKey(key);
      const hash2 = await hashSyncKey(key.toLowerCase());
      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
      expect(hash1).toBe(hash2);
    });

    it('throws error when hashing an invalid sync key', async () => {
      await expect(hashSyncKey('invalid-key')).rejects.toThrow('Invalid sync key format');
    });
  });
});
