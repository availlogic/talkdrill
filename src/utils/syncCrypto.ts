const SYNC_KEY_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const SYNC_KEY_REGEX = /^TD-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/;

export function normalizeSyncKey(key: string): string {
  if (!key) return '';
  return key.trim().toUpperCase();
}

export function isValidSyncKey(key: string): boolean {
  const normalized = normalizeSyncKey(key);
  return SYNC_KEY_REGEX.test(normalized);
}

function getRandomBase32Char(): string {
  const randomBytes = new Uint8Array(1);
  const maxValid = 256 - (256 % SYNC_KEY_CHARSET.length);
  let val = 255;
  while (val >= maxValid) {
    crypto.getRandomValues(randomBytes);
    val = randomBytes[0];
  }
  return SYNC_KEY_CHARSET[val % SYNC_KEY_CHARSET.length];
}

function generateSegment(length: number): string {
  let segment = '';
  for (let i = 0; i < length; i += 1) {
    segment += getRandomBase32Char();
  }
  return segment;
}

export function generateSyncKey(): string {
  const segments = [
    generateSegment(4),
    generateSegment(4),
    generateSegment(4),
    generateSegment(4),
  ];
  return `TD-${segments.join('-')}`;
}

export async function hashSyncKey(key: string): Promise<string> {
  const normalized = normalizeSyncKey(key);
  if (!isValidSyncKey(normalized)) {
    throw new Error('Invalid sync key format');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
