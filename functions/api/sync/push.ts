import {
  createCorsResponse,
  jsonResponse,
  authenticateSyncRequest,
  getR2Bucket,
  type SyncEnv,
} from './_helpers';

export async function onRequestOptions(): Promise<Response> {
  return createCorsResponse();
}

interface RawSnapshotPayload {
  schemaVersion?: number;
  exportedAt?: number;
  articles?: unknown[];
  drillLogs?: unknown[];
  settings?: unknown[];
}

function isValidSnapshot(body: unknown): body is RawSnapshotPayload {
  if (!body || typeof body !== 'object') return false;
  const p = body as RawSnapshotPayload;
  return (
    typeof p.schemaVersion === 'number' &&
    typeof p.exportedAt === 'number' &&
    Array.isArray(p.articles) &&
    Array.isArray(p.drillLogs) &&
    Array.isArray(p.settings)
  );
}

export async function onRequestPost({
  request,
  env,
}: {
  request: Request;
  env: SyncEnv;
}): Promise<Response> {
  const auth = await authenticateSyncRequest(request);
  if (auth instanceof Response) return auth;

  const bucket = getR2Bucket(env);
  if (bucket instanceof Response) return bucket;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Malformed JSON payload' }, 400);
  }

  if (!isValidSnapshot(body)) {
    return jsonResponse({ error: 'Invalid snapshot payload structure' }, 400);
  }

  const namespace = auth.namespace;
  const snapshotJson = JSON.stringify(body);
  await bucket.put(`users/${namespace}/snapshot.json`, snapshotJson, {
    httpMetadata: { contentType: 'application/json' },
  });

  const manifest = {
    exists: true,
    updatedAt: body.exportedAt,
    articleCount: body.articles?.length || 0,
    drillLogCount: body.drillLogs?.length || 0,
  };
  await bucket.put(`users/${namespace}/manifest.json`, JSON.stringify(manifest), {
    httpMetadata: { contentType: 'application/json' },
  });

  return jsonResponse({ success: true, updatedAt: body.exportedAt });
}
