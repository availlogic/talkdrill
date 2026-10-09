import { isValidSyncKey, hashSyncKey } from '../../../src/utils/syncCrypto';

export interface R2ObjectMetadata {
  contentType?: string;
}

export interface R2ObjectBodyMock {
  body: ReadableStream;
  httpMetadata?: R2ObjectMetadata;
  json<T = unknown>(): Promise<T>;
  text(): Promise<string>;
}

export interface R2BucketBinding {
  get(key: string): Promise<R2ObjectBodyMock | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | Uint8Array | string,
    options?: { httpMetadata?: R2ObjectMetadata }
  ): Promise<unknown>;
  head(key: string): Promise<unknown | null>;
  delete(key: string): Promise<void>;
}

export interface SyncEnv {
  TALKDRILL_BUCKET?: R2BucketBinding;
  SYNC_BUCKET?: R2BucketBinding;
}

export const SYNC_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-sync-key',
};

export function createCorsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: SYNC_CORS_HEADERS,
  });
}

export function jsonResponse(data: unknown, status = 200): Response {
  const headers = new Headers(SYNC_CORS_HEADERS);
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(data), { status, headers });
}

export async function authenticateSyncRequest(
  request: Request
): Promise<{ namespace: string } | Response> {
  const syncKey = request.headers.get('x-sync-key');
  if (!syncKey || !isValidSyncKey(syncKey)) {
    return jsonResponse({ error: 'Missing or invalid x-sync-key' }, 401);
  }
  const namespace = await hashSyncKey(syncKey);
  return { namespace };
}

export function getR2Bucket(env: SyncEnv): R2BucketBinding | Response {
  const bucket = env.TALKDRILL_BUCKET || env.SYNC_BUCKET;
  if (!bucket) {
    return jsonResponse({ error: 'R2 bucket not configured' }, 500);
  }
  return bucket;
}
